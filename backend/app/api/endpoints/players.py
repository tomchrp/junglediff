"""
===============================================================================
FICHIER : backend/app/api/endpoints/players.py
PROJET  : JungleDiff

DESCRIPTION :
Routeur gérant les interactions liées aux joueurs. Expose la route d'ingestion 
(update), les routes de lecture (summary, champion-stats), ainsi que la route 
de polling (sync-status).

MODIFICATIONS :
- NORMALISATION : Suppression de la traduction forcée UTILITY -> SUPPORT dans 
  la route get_champion_stats. Le backend requiert désormais la base de données 
  avec le terme exact de Riot Games (UTILITY), rétablissant ainsi le bon 
  fonctionnement de la Sidebar.
===============================================================================
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, and_
from sqlalchemy.orm import aliased
from pydantic import BaseModel, Field
from typing import Optional
import time

from app.db.session import get_db
from app.services.sync_service import SyncService
from app.services.riot_client import RateLimitExceeded
from app.db.repositories import PlayerRepository
from app.db.models import Player, MatchParticipant, Match

router = APIRouter()

class PlayerSyncRequest(BaseModel):
    server: str = Field(..., description="Le serveur ciblé (ex: EUW, NA, KR)")
    game_name: str = Field(..., description="Le pseudo Riot du joueur")
    tag_line: str = Field(..., description="Le tag Riot du joueur (sans le #)")

@router.post("/update")
async def update_player_profile(request: PlayerSyncRequest, db: AsyncSession = Depends(get_db)):
    """
    Point d'entrée principal pour la synchronisation du profil joueur.
    Implémente une vérification locale robuste avant de tenter l'appel Riot. 
    Si le client Riot lève une exception de Rate Limit, la fonction bascule 
    en mode Offline-First.
    """
    clean_db_name = func.replace(func.lower(Player.riot_id_name), ' ', '')
    clean_req_name = request.game_name.lower().replace(' ', '')
    
    query = select(Player).where(
        clean_db_name == clean_req_name,
        func.lower(Player.riot_id_tagline) == func.lower(request.tag_line)
    )
    
    local_player_result = await db.execute(query)
    local_player = local_player_result.scalars().first()
    
    service = SyncService(db)
    
    try:
        result = await service.sync_player_profile(request.server, request.game_name, request.tag_line)
        
        if result and "error" in result:
            if local_player:
                return {"status": "offline_fallback", "puuid": local_player.puuid, "warning": result["error"]}
            raise HTTPException(status_code=404, detail=result["error"])
            
        return result
        
    except RateLimitExceeded as e:
        if local_player:
            return {
                "status": "offline_fallback", 
                "puuid": local_player.puuid, 
                "warning": "Mode hors-ligne: Le Crawler monopolise l'API."
            }
            
        raise HTTPException(
            status_code=429, 
            detail=f"Le Crawler analyse actuellement un volume massif de données. Veuillez réessayer dans {e.ttl} secondes."
        )

@router.get("/{puuid}/summary")
async def get_player_summary(puuid: str, db: AsyncSession = Depends(get_db)):
    """
    Renvoie les informations globales du joueur pour la PlayerStatCard.
    Intègre le calcul dynamique de la voie préférée basée sur l'échantillon 
    des dernières parties jouées.
    """
    repo = PlayerRepository(db)
    player = await repo.get_player_by_puuid(puuid)
    
    if not player:
        raise HTTPException(status_code=404, detail="Joueur introuvable en base de données.")
        
    recent_matches_subq = (
        select(MatchParticipant.lane)
        .join(Match, MatchParticipant.match_id == Match.match_id)
        .where(MatchParticipant.puuid == puuid)
        .order_by(Match.creation_timestamp.desc())
        .limit(60)
        .subquery()
    )

    pref_lane_query = (
        select(recent_matches_subq.c.lane)
        .where(recent_matches_subq.c.lane.notin_(["", "INVALID"]))
        .group_by(recent_matches_subq.c.lane)
        .order_by(func.count().desc())
        .limit(1)
    )

    result_lane = await db.execute(pref_lane_query)
    preferred_lane = result_lane.scalar_one_or_none()

    if not preferred_lane:
        preferred_lane = "JUNGLE"
        
    return {
        "puuid": player.puuid,
        "riotIdGameName": player.riot_id_name,
        "riotIdTagline": player.riot_id_tagline,
        "profileIconId": player.profile_icon_id,
        "summonerLevel": player.summoner_level,
        "tier": player.tier,
        "rank": player.rank,
        "leaguePoints": player.league_points,
        "lastUpdate": player.last_update_timestamp,
        "preferredLane": preferred_lane
    }

@router.get("/{puuid}/champion-stats")
async def get_champion_stats(
    puuid: str, 
    lane: Optional[str] = Query(None, description="Filtrer par rôle"),
    patch: Optional[str] = Query(None, description="Filtrer par patch"),
    db: AsyncSession = Depends(get_db)
):
    """
    Renvoie les statistiques agrégées des champions pour l'affichage de la Sidebar.
    Transmet le rôle brut (ex: UTILITY) au repository pour garantir la correspondance
    avec la donnée stockée.
    """
    repo = PlayerRepository(db)
    stats = await repo.get_champion_stats_sidebar(puuid, lane, patch)
    return {"championStats": stats}

@router.get("/{puuid}/sync-status")
async def get_sync_status(puuid: str, db: AsyncSession = Depends(get_db)):
    """
    Détermine l'état de synchronisation d'un joueur en base de données.
    """
    query_player = select(Player).where(Player.puuid == puuid)
    result_player = await db.execute(query_player)
    player = result_player.scalar_one_or_none()
    
    if not player:
        return {"status": "not_found"}

    query_matches = select(func.count()).select_from(MatchParticipant).where(MatchParticipant.puuid == puuid)
    result_matches = await db.execute(query_matches)
    match_count = result_matches.scalar()

    current_time = int(time.time() * 1000)
    last_update = player.last_update_timestamp or 0
    time_elapsed_ms = current_time - last_update

    if time_elapsed_ms > 60000 or match_count >= 60:
        return {"status": "completed", "matches_ingested": match_count}

    return {"status": "in_progress", "matches_ingested": match_count}

@router.get("/{puuid}/analytics")
async def get_player_analytics(
    puuid: str,
    lane: str,
    type: str,
    patch: str = "ALL",
    champion_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint analytique dédié au croisement de données massives (Synergies/Matchups).
    Effectue une auto-jointure sur la table MatchParticipant pour calculer 
    l'impact croisé des joueurs.
    """
    mp1 = aliased(MatchParticipant)
    mp2 = aliased(MatchParticipant)
    match_table = aliased(Match)

    conditions = [
        mp1.puuid == puuid,
        mp1.lane == lane
    ]
    
    if champion_id:
        conditions.append(mp1.champion_id == champion_id)

    q = select(
        mp2.lane,
        mp2.champion_id,
        func.count().label("games_played"),
        func.sum(case((mp1.win == True, 1), else_=0)).label("wins")
    ).join(
        mp2, mp1.match_id == mp2.match_id
    )

    if patch != "ALL":
        q = q.join(match_table, mp1.match_id == match_table.match_id)
        q = q.where(match_table.game_version.startswith(patch))

    if type == "SYNERGIES":
        q = q.where(and_(
            mp1.team_id == mp2.team_id,
            mp1.puuid != mp2.puuid
        ))
    else: 
        q = q.where(mp1.team_id != mp2.team_id)

    q = q.where(*conditions)
    q = q.group_by(mp2.lane, mp2.champion_id)

    result = await db.execute(q)
    rows = result.all()

    # Le frontend et la DB s'attendent bien à recevoir UTILITY
    data = {"TOP": [], "JUNGLE": [], "MIDDLE": [], "BOTTOM": [], "UTILITY": []}
    
    for row in rows:
        pos = row.lane
        if pos not in data:
            continue
            
        games = row.games_played
        wins = row.wins
        winrate = round((wins / games) * 100) if games > 0 else 0
        
        data[pos].append({
            "championId": row.champion_id,
            "winrate": winrate,
            "gamesPlayed": games,
            "wins": wins
        })
        
    for pos in data:
        data[pos].sort(key=lambda x: (x["gamesPlayed"], x["winrate"]), reverse=True)

    return data

@router.get("/{puuid}/jungle-paths")
async def get_player_jungle_paths(
    puuid: str, 
    champion_id: Optional[int] = Query(None, description="Filtrer par ID de champion"),
    session: AsyncSession = Depends(get_db)
):
    """
    Récupère et agglomère les coordonnées spatiales du premier clear jungle.
    """
    stmt = select(
        MatchParticipant.team_id,
        MatchParticipant.pos_f1_x, MatchParticipant.pos_f1_y,
        MatchParticipant.pos_f2_x, MatchParticipant.pos_f2_y,
        MatchParticipant.pos_f3_x, MatchParticipant.pos_f3_y
    ).where(
        MatchParticipant.puuid == puuid,
        MatchParticipant.lane == 'JUNGLE',
        MatchParticipant.pos_f1_x.isnot(None)
    )
    
    if champion_id:
        stmt = stmt.where(MatchParticipant.champion_id == champion_id)
    
    result = await session.execute(stmt)
    rows = result.fetchall()
    
    paths = []
    for row in rows:
        paths.append({
            "teamId": row.team_id,
            "f1": {"x": row.pos_f1_x, "y": row.pos_f1_y},
            "f2": {"x": row.pos_f2_x, "y": row.pos_f2_y},
            "f3": {"x": row.pos_f3_x, "y": row.pos_f3_y}
        })
        
    return {"paths": paths}