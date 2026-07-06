"""
===============================================================================
FICHIER : backend/app/api/endpoints/synergies.py
PROJET  : JungleDiff

DESCRIPTION :
Routeur FastAPI gérant les points d'accès des analyses croisées.
Fournit les endpoints permettant d'extraire les performances relationnelles.

MODIFICATIONS :
- Réintégration du paramètre optionnel `champion_id` au niveau des requêtes Query.
- Transmission transparente de ce filtre vers le SynergyOrchestrator pour
  résoudre la rupture de synchronisation avec la Sidebar du Frontend.
===============================================================================
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.analysis.synergy_orchestrator import SynergyOrchestrator

router = APIRouter()

@router.get("/{puuid}/matchups")
async def get_matchups_analysis(
    puuid: str,
    lane: str = Query(..., description="Rôle ciblé (ex: JUNGLE)"),
    type: str = Query("MATCHUPS", description="SYNERGIES (alliés) ou MATCHUPS (ennemis)"),
    time_filter: str = Query("recent"),
    recent_count: int = Query(20),
    champion_id: Optional[int] = Query(None, description="Identifiant unique du champion joué par l'utilisateur"),
    db: AsyncSession = Depends(get_db)
):
    """
    Point d'accès interceptant les requêtes de filtres d'analyses croisées.
    
    Cette fonction valide les query-params injectés par le client, calcule les limites
    temporelles (carrière globale vs historique récent glissant) et délègue la charge
    algorithmique à l'orchestrateur dédié en lui transmettant le filtre champion pivot.
    """
    orchestrator = SynergyOrchestrator(db)
    limit = None if time_filter == "career" else recent_count
    
    try:
        data = await orchestrator.get_player_matchups(
            puuid=puuid, 
            role=lane.upper(), 
            analysis_type=type.upper(), 
            limit=limit,
            player_champion_id=champion_id
        )
        return {
            "status": "success",
            "lane": lane.upper(),
            "type": type.upper(),
            "data": data 
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))