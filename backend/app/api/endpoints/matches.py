"""
===============================================================================
FICHIER : backend/app/api/endpoints/matches.py
PROJET  : JungleDiff

DESCRIPTION :
Routeur dédié à la récupération de l'historique des matchs. Gère la pagination
et les filtres croisés appliqués depuis le frontend.
===============================================================================
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.db.session import get_db
from app.db.repositories import MatchRepository
from app.db.models import MatchTimeline
from app.services.sync_service import SyncService

router = APIRouter()

@router.get("/{puuid}/history")
async def get_match_history(
    puuid: str,
    end_time: Optional[int] = Query(None, description="Timestamp du match le plus ancien actuellement affiché"),
    limit: int = Query(10, ge=1, le=50),
    lane: Optional[str] = Query(None, description="Filtrer par rôle"),
    champion_id: Optional[int] = Query(None, description="Filtrer par ID de champion"),
    db: AsyncSession = Depends(get_db)
):
    """
    Renvoie la liste des matchs avec pagination temporelle stricte pour le Lazy Loading.
    Garantit l'absence de doublons même si de nouveaux matchs sont ingérés en arrière-plan.
    """
    repo = MatchRepository(db)
    matches = await repo.get_match_history_paginated(puuid, end_time, limit, lane, champion_id)
    
    return {
        "puuid": puuid,
        "end_time": end_time,
        "limit": limit,
        "count": len(matches),
        "matches": matches
    }

@router.get("/{match_id}/timeline/status")
async def get_timeline_status(
    match_id: str, 
    puuid: str = Query(..., description="Le PUUID du joueur pour le pre-fetch"),
    server: str = Query("EUW", description="Le serveur (EUW, NA, KR)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Route de Polling pour la MatchCard.
    Vérifie si la Timeline est en base. Si non, déclenche l'ingestion P0/P1.
    """
    # 1. Vérification ultra-rapide
    timeline = await db.get(MatchTimeline, match_id)
    
    if timeline:
        return {
            "status": "ready",
            "data": timeline.raw_timeline_data
        }
        
    # 2. Si absente, on déclenche le service d'anticipation (Fire and Forget)
    service = SyncService(db)
    await service.trigger_timeline_prefetch(match_id, puuid, server)
    
    # 3. On répond 202 Accepted (En cours de traitement)
    return {"status": "loading"}