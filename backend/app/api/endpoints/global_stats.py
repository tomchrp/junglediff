"""
===============================================================================
FICHIER : backend/app/api/endpoints/global_stats.py
PROJET  : JungleDiff

DESCRIPTION :
Routeur FastAPI dédié aux statistiques globales (Big Data).
Interroge le Hot Storage pour les données de champions et le Cold Storage (JSONB)
pour la ventilation absolue par type de file d'attente (queue_id).

FONCTIONNALITÉS :
- get_global_champions : Agrège les matchs par champion et effectue un 
  groupement (GROUP BY) directement dans les propriétés JSON des matchs pour
  isoler les modes de jeu (SoloQ, ARAM, Flex, etc.).
===============================================================================
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case

from app.db.session import get_db
from app.db.models import MatchParticipant, Match

router = APIRouter()

@router.get("/champions", response_model=Dict[str, Any])
async def get_global_champions(db: AsyncSession = Depends(get_db)):
    """
    Récupère les statistiques de champions et lit la colonne JSON raw_match_data 
    pour grouper les parties par type de file (queueId).
    """
    try:
        # 1. Agrégation par mode de jeu via lecture JSONB
        # Astuce PostgreSQL : On utilise .astext pour extraire la valeur JSON 
        # sous forme de chaîne de caractères et pouvoir la grouper.
        queue_expr = Match.raw_match_data['info']['queueId'].astext
        query_modes = (
            select(
                queue_expr.label("queue_id"),
                func.count(Match.match_id).label("count")
            )
            .group_by(queue_expr)
        )
        
        modes_result = await db.execute(query_modes)
        modes_rows = modes_result.fetchall()
        
        # Dictionnaire de traduction des files courantes Riot
        queue_dict = {
            "420": "Classé Solo/Duo",
            "440": "Classé Flex",
            "400": "Draft Normal",
            "450": "ARAM",
            "430": "Aveugle Normal",
            "490": "Partie Rapide",
            "1700": "Arena",
            "1900": "URF"
        }
        
        modes_repartition = []
        total_matches_in_db = 0
        
        for row in modes_rows:
            q_id_str = str(row.queue_id)
            count = row.count
            total_matches_in_db += count
            modes_repartition.append({
                "queue_id": q_id_str,
                "name": queue_dict.get(q_id_str, f"Inconnu ({q_id_str})"),
                "count": count
            })
            
        # Tri décroissant pour afficher les modes les plus joués en premier
        modes_repartition.sort(key=lambda x: x["count"], reverse=True)

        # 2. Agrégation des champions (Hot Storage)
        query_champs = (
            select(
                MatchParticipant.champion_id,
                func.count(MatchParticipant.id).label("total_matches"),
                func.sum(case((MatchParticipant.win == True, 1), else_=0)).label("total_wins")
            )
            .group_by(MatchParticipant.champion_id)
            .order_by(func.count(MatchParticipant.id).desc())
        )
        
        result_champs = await db.execute(query_champs)
        rows_champs = result_champs.fetchall()
        
        champions_data = []
        total_participations = 0
        
        for row in rows_champs:
            champ_id, matches, wins = row
            total_participations += matches
            
            champions_data.append({
                "champion_id": champ_id,
                "total_matches": matches,
                "total_wins": wins,
                "winrate": round((wins / matches) * 100, 1) if matches > 0 else 0
            })
            
        return {
            "status": "success",
            "total_matches_in_db": total_matches_in_db,
            "total_analyzed_participations": total_participations,
            "modes_repartition": modes_repartition,
            "champions": champions_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'agrégation: {str(e)}")