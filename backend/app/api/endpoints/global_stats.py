"""
===============================================================================
FICHIER : backend/app/api/endpoints/global_stats.py
PROJET  : JungleDiff

DESCRIPTION :
Routeur FastAPI dédié aux analyses globales (Big Data communautaire).
Ces routes agrègent massivement les données du Hot Storage (MatchParticipant)
et évaluent la santé du Data Lake.

MODIFICATIONS :
- Modification de la route /champions : L'agrégation SQL se fait désormais 
  par champion_id ET par lane. Le backend reconstruit ensuite un dictionnaire 
  complet pour fournir la répartition volumétrique des rôles (lanes) par champion,
  permettant de diagnostiquer les anomalies de classification de l'API Riot.
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
    Agrège les statistiques globales des champions et leur distribution spatiale.
    
    Cette fonction interroge la base de données en groupant par champion ET par lane.
    Elle reconstruit ensuite en mémoire un dictionnaire unifié par champion, 
    calculant le KDA et le Winrate global via des moyennes pondérées tout en 
    conservant le détail du volume de jeu par rôle (dictionnaire 'lanes').
    """
    query = select(
        MatchParticipant.champion_id,
        MatchParticipant.lane,
        func.count(MatchParticipant.id).label('games'),
        func.sum(cast(MatchParticipant.win, Integer)).label('wins'),
        func.sum(MatchParticipant.kills).label('total_kills'),
        func.sum(MatchParticipant.deaths).label('total_deaths'),
        func.sum(MatchParticipant.assists).label('total_assists')
    ).group_by(MatchParticipant.champion_id, MatchParticipant.lane)
    
    result = await db.execute(query)
    
    # Étape 1 : Construction du dictionnaire consolidé
    champions_dict = {}
    for row in result:
        c_id, lane, games, wins, tkills, tdeaths, tassists = row
        
        if c_id not in champions_dict:
            champions_dict[c_id] = {
                "total_games": 0,
                "total_wins": 0,
                "total_kills": 0,
                "total_deaths": 0,
                "total_assists": 0,
                "lanes": {}
            }
        
        champions_dict[c_id]["total_games"] += games
        champions_dict[c_id]["total_wins"] += (wins or 0)
        champions_dict[c_id]["total_kills"] += (tkills or 0)
        champions_dict[c_id]["total_deaths"] += (tdeaths or 0)
        champions_dict[c_id]["total_assists"] += (tassists or 0)
        champions_dict[c_id]["lanes"][lane] = games

    # Étape 2 : Formatage en pourcentages et moyennes pour le frontend
    champions_stats = []
    for c_id, data in champions_dict.items():
        tg = data["total_games"]
        champions_stats.append({
            "champion_id": c_id,
            "games": tg,
            "winrate": round((data["total_wins"] / tg * 100), 2) if tg > 0 else 0,
            "kda": {
                "k": round(data["total_kills"] / tg, 1) if tg > 0 else 0,
                "d": round(data["total_deaths"] / tg, 1) if tg > 0 else 0,
                "a": round(data["total_assists"] / tg, 1) if tg > 0 else 0
            },
            "lanes": data["lanes"]
        })
        
    return {"data": sorted(champions_stats, key=lambda x: x["games"], reverse=True)}