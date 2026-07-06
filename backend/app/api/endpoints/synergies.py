"""
===============================================================================
FICHIER : backend/app/api/endpoints/synergies.py
===============================================================================
"""
from fastapi import APIRouter, Depends, Query, HTTPException
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
    db: AsyncSession = Depends(get_db)
):
    orchestrator = SynergyOrchestrator(db)
    limit = None if time_filter == "career" else recent_count
    
    try:
        data = await orchestrator.get_player_matchups(puuid=puuid, role=lane.upper(), analysis_type=type.upper(), limit=limit)
        return {
            "status": "success",
            "lane": lane.upper(),
            "type": type.upper(),
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))