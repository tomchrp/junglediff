"""
===============================================================================
FICHIER : backend/app/api/endpoints/global_stats.py
PROJET  : JungleDiff

DESCRIPTION :
Routeur FastAPI dédié aux statistiques globales (Big Data).
Interroge le Hot Storage (table match_participants) pour agréger les données
sur l'ensemble des parties ingérées par le crawler, sans filtrer par joueur.

FONCTIONNALITÉS :
- get_global_champions : Agrège les matchs par champion, calcule le volume total
  et le taux de victoire global.
===============================================================================
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case

from app.db.session import get_db
from app.db.models import MatchParticipant

router = APIRouter()

@router.get("/champions", response_model=Dict[str, Any])
async def get_global_champions(db: AsyncSession = Depends(get_db)):
    """
    Récupère la liste de tous les champions joués dans la base de données,
    triés par popularité (nombre de matchs décroissant).
    """
    try:
        # 1. Requête d'agrégation SQL optimisée
        query = (
            select(
                MatchParticipant.champion_id,
                func.count(MatchParticipant.id).label("total_matches"),
                func.sum(case((MatchParticipant.win == True, 1), else_=0)).label("total_wins")
            )
            .group_by(MatchParticipant.champion_id)
            .order_by(func.count(MatchParticipant.id).desc())
        )
        
        result = await db.execute(query)
        rows = result.fetchall()
        
        # 2. Formatage de la réponse
        champions_data = []
        total_games_in_db = 0
        
        for row in rows:
            champ_id, matches, wins = row
            total_games_in_db += matches
            
            champions_data.append({
                "champion_id": champ_id,
                "total_matches": matches,
                "total_wins": wins,
                "winrate": round((wins / matches) * 100, 1) if matches > 0 else 0
            })
            
        return {
            "status": "success",
            "total_analyzed_participations": total_games_in_db,
            "champions": champions_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'agrégation: {str(e)}")