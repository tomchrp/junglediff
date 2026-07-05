"""
===============================================================================
FICHIER : backend/app/api/endpoints/global_stats.py
PROJET  : JungleDiff

DESCRIPTION :
Routeur FastAPI dédié aux analyses globales (Big Data communautaire).
Ces routes agrègent massivement les données du Hot Storage (MatchParticipant)
et évaluent la santé du Data Lake (Couverture des Timelines).

MODIFICATIONS :
- Ajout de /telemetry : Vérifie le ratio Matchs/Timelines en base.
- Ajout de /snowball : Agrège les nouvelles métriques temporelles à 15 min 
  pour valider les conditions de victoire communautaires.
===============================================================================
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Integer, desc

from app.db.session import get_db
from app.db.models import MatchParticipant, Match, MatchTimeline

router = APIRouter()

@router.get("/telemetry", response_model=Dict[str, Any])
async def get_system_telemetry(db: AsyncSession = Depends(get_db)):
    """
    Exécute un comptage global des tables primaires pour évaluer la santé du Data Lake.
    Retourne le nombre absolu de matchs, de timelines, et le pourcentage de couverture.
    """
    match_count = await db.scalar(select(func.count(Match.match_id)))
    timeline_count = await db.scalar(select(func.count(MatchTimeline.match_id)))
    
    # Évite la division par zéro sur une base vierge
    coverage = (timeline_count / match_count * 100) if match_count and match_count > 0 else 0
    
    return {
        "total_matches": match_count or 0,
        "total_timelines": timeline_count or 0,
        "timeline_coverage_percent": round(coverage, 2)
    }

@router.get("/snowball", response_model=Dict[str, Any])
async def get_snowball_metrics(db: AsyncSession = Depends(get_db)):
    """
    Analyse l'impact de l'économie à 15 minutes sur l'issue de la partie.
    Calcule le winrate conditionnel (Snowball vs Behind) et identifie 
    les champions générant le plus grand écart de ressources.
    """
    # 1. Analyse de la condition de victoire (Winrate si Snowball)
    # Calcule le taux de victoire global selon l'état de l'avantage (is_snowballing)
    winrate_query = select(
        MatchParticipant.is_snowballing,
        func.count(MatchParticipant.id).label('total_games'),
        func.sum(cast(MatchParticipant.win, Integer)).label('total_wins')
    ).where(MatchParticipant.is_snowballing.isnot(None))\
     .group_by(MatchParticipant.is_snowballing)
    
    winrate_result = await db.execute(winrate_query)
    snowball_stats = {"snowballing": None, "behind_or_even": None}
    
    for row in winrate_result:
        is_snowballing, total, wins = row
        wr = round((wins / total * 100), 2) if total > 0 else 0
        stat_obj = {"games": total, "winrate": wr}
        
        if is_snowballing:
            snowball_stats["snowballing"] = stat_obj
        else:
            snowball_stats["behind_or_even"] = stat_obj

    # 2. Les Gouffres à Golds (Top 5 Champions avg_gold_diff)
    # Filtre les champions joués au moins 5 fois pour éliminer les valeurs aberrantes
    top_gold_query = select(
        MatchParticipant.champion_id,
        func.count(MatchParticipant.id).label('games'),
        func.avg(MatchParticipant.gold_diff_15m).label('avg_gold_diff')
    ).where(MatchParticipant.gold_diff_15m.isnot(None))\
     .group_by(MatchParticipant.champion_id)\
     .having(func.count(MatchParticipant.id) >= 5)\
     .order_by(desc('avg_gold_diff'))\
     .limit(5)
     
    top_gold_result = await db.execute(top_gold_query)
    top_champions = [
        {"champion_id": row[0], "games": row[1], "avg_gold_diff": int(row[2])}
        for row in top_gold_result
    ]

    return {
        "winrate_analysis": snowball_stats,
        "top_snowballers": top_champions
    }

@router.get("/champions", response_model=Dict[str, Any])
async def get_global_champion_stats(db: AsyncSession = Depends(get_db)):
    """
    Agrège les statistiques globales des champions sur l'ensemble de la base.
    Note technique : Cette requête provoquera des ralentissements massifs lorsque 
    la base dépassera les 500k lignes. À migrer vers une Vue Matérialisée ultérieurement.
    """
    query = select(
        MatchParticipant.champion_id,
        func.count(MatchParticipant.id).label('total_games'),
        func.sum(cast(MatchParticipant.win, Integer)).label('total_wins'),
        func.avg(MatchParticipant.kills).label('avg_kills'),
        func.avg(MatchParticipant.deaths).label('avg_deaths'),
        func.avg(MatchParticipant.assists).label('avg_assists')
    ).group_by(MatchParticipant.champion_id)
    
    result = await db.execute(query)
    
    champions_stats = []
    for row in result:
        total_games = row[1]
        wins = row[2] or 0
        champions_stats.append({
            "champion_id": row[0],
            "games": total_games,
            "winrate": round((wins / total_games * 100), 2) if total_games > 0 else 0,
            "kda": {
                "k": round(row[3], 1),
                "d": round(row[4], 1),
                "a": round(row[5], 1)
            }
        })
        
    return {"data": sorted(champions_stats, key=lambda x: x["games"], reverse=True)}