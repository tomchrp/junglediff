"""
===============================================================================
FICHIER : backend/app/api/endpoints/matches.py
PROJET  : JungleDiff

DESCRIPTION :
Routeur FastAPI dédié à la gestion des matchs et des timelines. Expose les
points d'accès pour l'historique paginé, le filtrage par patch, et l'analyse IA.

MODIFICATIONS :
- NORMALISATION : Retrait de la traduction UTILITY -> SUPPORT dans l'historique 
  paginé pour garantir le chargement correct des parties dans la MatchList.
- CONSERVATION : La traduction 'internal_role' est conservée **uniquement** dans la route d'analyse IA (`get_role_analysis`) pour assurer le mapping 
  avec les noms de tes classes Python métier (ex: SupportAgency).
===============================================================================
"""

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from app.db.session import get_db
from app.db.repositories import MatchRepository
from app.db.models import MatchTimeline, Match
from app.services.sync_service import SyncService
from app.services.analysis.orchestrator import AnalysisOrchestrator

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
    s'il doit faire un appel API Riot ou s'il lui reste de la donnée locale.
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
    en base de données locale pour un joueur spécifique.
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
    Vérifie si la Timeline est prête et orchestre l'anticipation asynchrone (P0/P1) 
    via les workers ARQ.
    """
    timeline = await db.get(MatchTimeline, match_id)
    
    if timeline:
        return {
            "status": "ready",
            "data": timeline.raw_timeline_data
        }
        
    targets = [match_id]
    if prefetch_ids:
        adjacent_list = [m_id.strip() for m_id in prefetch_ids.split(",") if m_id.strip()]
        targets.extend(adjacent_list)
    
    service = SyncService(db)
    await service.trigger_timeline_prefetch(target_ids=targets, server=server)
    
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
    """
    service = SyncService(db)
    result = await service.fetch_older_matches(server=server, puuid=puuid, start_index=current_total)
    
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
        
    return result

@router.get("/{match_id}/analysis/{role}")
async def get_role_analysis(match_id: str, role: str, puuid: str, db: AsyncSession = Depends(get_db)):
    """
    Endpoint générique pour récupérer l'analyse de rôle.
    Instancie le bon analyseur en fonction du rôle demandé.
    Intègre désormais la récupération de la timeline pour les métriques temporelles.
    """
    query_match = select(Match.raw_match_data).where(Match.match_id == match_id)
    result_match = await db.execute(query_match)
    raw_match_data = result_match.scalar_one_or_none()

    if not raw_match_data:
        raise HTTPException(status_code=404, detail="Partie introuvable.")

    query_timeline = select(MatchTimeline.raw_timeline_data).where(MatchTimeline.match_id == match_id)
    result_timeline = await db.execute(query_timeline)
    raw_timeline_data = result_timeline.scalar_one_or_none()

    participants = raw_match_data.get("info", {}).get("participants", [])
    target_participant = next((p for p in participants if p.get("puuid") == puuid), None)
    
    if not target_participant:
        raise HTTPException(status_code=404, detail="Joueur introuvable dans cette partie.")

    opponent = next((
        p for p in participants 
        if p.get("teamPosition") == target_participant.get("teamPosition") 
        and p.get("teamId") != target_participant.get("teamId")
        and p.get("teamPosition") not in ["NONE", ""]
    ), None)

    role_upper = role.upper()
    
    # LA SEULE EXCEPTION LÉGITIME : On mappe UTILITY vers SUPPORT uniquement ici 
    # pour permettre à l'Orchestrateur de trouver les classes Python "SupportAgency", etc.
    internal_role = "SUPPORT" if role_upper == "UTILITY" else role_upper

    orchestrator = AnalysisOrchestrator()
    analysis_result = orchestrator.analyze_match(
        role=internal_role, 
        participant=target_participant, 
        match_data=raw_match_data, 
        timeline_data=raw_timeline_data, 
        opponent=opponent
    )
    
    return {
        "status": "ready",
        "data": analysis_result
    }