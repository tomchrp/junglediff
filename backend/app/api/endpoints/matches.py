"""
===============================================================================
FICHIER : backend/app/api/endpoints/matches.py
PROJET  : JungleDiff

DESCRIPTION :
Routeur FastAPI dédié à la gestion des matchs et des timelines. Expose les
points d'accès pour l'historique paginé, le filtrage par patch, le polling
de statut des timelines avec stratégie d'anticipation, et le déclenchement
du Deep Fetch pour remonter l'historique Riot.
===============================================================================
"""

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

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
    patch: Optional[str] = Query(None, description="Filtrer par patch (ex: 16.12)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Renvoie la liste des matchs avec pagination temporelle stricte pour le Lazy Loading.
    S'appuie sur la méthode optimisée du repository pour indiquer au frontend
    s'il doit faire un appel API Riot ou s'il lui reste de la donnée locale via
    le booléen has_more_in_db.
    """
    repo = MatchRepository(db)
    matches, has_more_in_db = await repo.get_match_history_paginated(
        puuid=puuid, 
        end_time=end_time, 
        limit=limit, 
        lane=lane, 
        champion_id=champion_id,
        patch=patch
    )
    
    return {
        "puuid": puuid,
        "end_time": end_time,
        "limit": limit,
        "patch": patch,
        "count": len(matches),
        "has_more_in_db": has_more_in_db,
        "matches": matches
    }


@router.get("/{puuid}/patches")
async def get_player_patches(puuid: str, db: AsyncSession = Depends(get_db)):
    """
    Renvoie la liste exhaustive et triée de tous les patchs distincts disponibles
    en base de données locale pour un joueur spécifique. Utilisé pour hydrater
    dynamiquement le menu déroulant du frontend.
    """
    repo = MatchRepository(db)
    patches = await repo.get_available_patches(puuid)
    return {
        "puuid": puuid,
        "patches": patches
    }


@router.get("/{match_id}/timeline/status")
async def get_timeline_status(
    match_id: str, 
    server: str = Query("EUW", description="Le serveur (EUW, NA, KR)"),
    prefetch_ids: Optional[str] = Query(None, description="Liste d'IDs de matchs adjacents séparés par des virgules pour l'anticipation spatiale (ex: ID1,ID2)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Route de Polling pour la MatchCard.
    Vrifie en priorité absolue si la Timeline du match cliqué est prête en base de données.
    Si elle est absente, elle délègue le téléchargement P0 de ce match ainsi que le prétéchargement
    P1 des matchs adjacents (fournis directement par le frontend pour économiser des requêtes SQL).
    """
    # 1. Vérification ultra-rapide en base pour le match cible
    timeline = await db.get(MatchTimeline, match_id)
    
    if timeline:
        return {
            "status": "ready",
            "data": timeline.raw_timeline_data
        }
        
    # 2. Construction de la liste des cibles pour le prefetch (Match actuel P0 + Matchs adjacents P1)
    targets = [match_id]
    if prefetch_ids:
        # Nettoyage et extraction des IDs envoyés par le frontend
        adjacent_list = [m_id.strip() for m_id in prefetch_ids.split(",") if m_id.strip()]
        targets.extend(adjacent_list)
    
    # 3. Déclenchement du service d'anticipation asynchrone sécurisé (Fire and Forget)
    service = SyncService(db)
    await service.trigger_timeline_prefetch(target_ids=targets, server=server)
    
    # 4. On répond 202 Accepted pour indiquer au front de continuer son polling
    return {"status": "loading"}


@router.post("/{puuid}/fetch-older")
async def fetch_older_player_matches(
    puuid: str,
    server: str = Query("EUW", description="Le serveur du joueur"),
    current_total: int = Query(..., ge=0, description="Le nombre total actuel de matchs possédés en base pour calculer l'offset Riot"),
    db: AsyncSession = Depends(get_db)
):
    """
    Point d'accès permettant au frontend de forcer l'ingestion de parties plus anciennes
    (Deep Fetch) lorsque l'utilisateur scrolle au bout de son historique local.
    Calcule dynamiquement l'index de départ ('start') pour l'API Riot afin de garantir
    la continuité du flux de données.
    """
    service = SyncService(db)
    result = await service.fetch_older_matches(server=server, puuid=puuid, start_index=current_total)
    
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
        
    return result