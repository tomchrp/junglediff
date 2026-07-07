"""
===============================================================================
FICHIER : backend/app/api/endpoints/global_duos.py
PROJET  : JungleDiff

DESCRIPTION :
Routeur FastAPI dédié à l'analyse globale de la Meta et des synergies de duos.
Connecte le frontend aux méthodes de requêtage brut sur la vue matérialisée
MVCommunitySynergies.
===============================================================================
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db import repositories
from typing import List, Dict, Any

router = APIRouter()

@router.get("/", response_model=List[Dict[str, Any]])
async def fetch_global_duos(
    primary_lane: str = Query(..., description="Role principal requis (ex: JUNGLE)"),
    secondary_lane: str = Query("ALL", description="Role secondaire ou ALL pour rechercher sur toute la carte"),
    db: AsyncSession = Depends(get_db)
):
    """
    Retourne la liste des meilleurs duos pour les lanes ciblées, classés par 
    volume de jeu. Calcule dynamiquement le Delta de Synergie.
    """
    try:
        duos = await repositories.get_global_duos(db, primary_lane, secondary_lane)
        return duos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors du calcul des duos : {str(e)}")


@router.get("/timeline", response_model=List[Dict[str, Any]])
async def fetch_duo_timeline(
    champ_a: int = Query(...),
    lane_a: str = Query(...),
    champ_b: int = Query(...),
    lane_b: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Retourne la courbe de performance temporelle (duration_bucket) pour le graphique 
    de la console, démontrant les Power Spikes du duo choisi.
    """
    try:
        timeline = await repositories.get_duo_timeline(db, champ_a, lane_a, champ_b, lane_b)
        return timeline
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération de la timeline : {str(e)}")