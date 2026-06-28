"""
===============================================================================
FICHIER : backend/app/api/endpoints/players.py
PROJET  : JungleDiff

DESCRIPTION :
Routeur gérant les interactions liées aux joueurs. Expose la route d'ingestion 
(update), les routes de lecture (summary, champion-stats), ainsi que la route 
de polling (sync-status) qui a été modifiée pour renvoyer le nombre de parties 
ingérées en temps réel.
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
    Route d'ingestion initiale. Déclenche le service de synchronisation qui 
    récupère le profil Riot, vérifie le Data Lake local, et place les nouvelles 
    parties en file d'attente ARQ.
    """
    service = SyncService(db)
    result = await service.sync_player_profile(request.server, request.game_name, request.tag_line)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return result

@router.get("/{puuid}/summary")
async def get_player_summary(puuid: str, db: AsyncSession = Depends(get_db)):
    """
    Renvoie les informations globales du joueur pour la PlayerStatCard.
    Intègre le calcul dynamique de la voie préférée (preferredLane) basée
    sur l'échantillon des 60 dernières parties jouées.
    """
    repo = PlayerRepository(db)
    player = await repo.get_player_by_puuid(puuid)
    
    if not player:
        raise HTTPException(status_code=404, detail="Joueur introuvable en base de données.")
        
    # --- CALCUL DE LA PREFERRED LANE ---
    
    # 1. Sous-requête : Restreindre l'échantillon aux 60 dernières parties du joueur
    # (Correspond au volume de l'ingestion initiale : 20 Solo, 20 Flex, 20 Normal)
    recent_matches_subq = (
        select(MatchParticipant.position)
        .join(Match, MatchParticipant.match_id == Match.match_id)
        .where(MatchParticipant.puuid == puuid)
        .order_by(Match.creation_timestamp.desc())
        .limit(60)
        .subquery()
    )

    # 2. Requête principale : Grouper, compter et récupérer la position dominante
    pref_lane_query = (
        select(recent_matches_subq.c.position)
        # On exclut les positions invalides que l'API Riot renvoie parfois (ex: ARAM, Arena)
        .where(recent_matches_subq.c.position.notin_(["", "INVALID"]))
        .group_by(recent_matches_subq.c.position)
        .order_by(func.count().desc())
        .limit(1)
    )

    result_lane = await db.execute(pref_lane_query)
    preferred_lane = result_lane.scalar_one_or_none()

    # 3. Fallback de sécurité (Race Condition)
    # Si le frontend appelle cette route alors que les workers ARQ n'ont pas encore 
    # inséré la moindre partie en base, on force une valeur par défaut.
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
    Renvoie les statistiques agrégées des champions pour la Sidebar.
    """
    repo = PlayerRepository(db)
    stats = await repo.get_champion_stats_sidebar(puuid, lane, patch)
    return {"championStats": stats}

@router.get("/{puuid}/sync-status")
async def get_sync_status(puuid: str, db: AsyncSession = Depends(get_db)):
    """
    Détermine l'état de synchronisation d'un joueur en base de données de façon 
    progressive.
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
    Endpoint analytique puissant. Effectue une auto-jointure sur MatchParticipant
    pour calculer le taux de victoire du joueur (mp1) en fonction de la présence
    d'un allié ou adversaire (mp2).
    """
    mp1 = aliased(MatchParticipant)
    mp2 = aliased(MatchParticipant)
    match_table = aliased(Match)

    # 1. Conditions strictes identifiant le joueur et son rôle
    conditions = [
        mp1.puuid == puuid,
        mp1.position == lane
    ]
    
    # 2. Ajout dynamique du filtre de champion si sélectionné
    if champion_id:
        conditions.append(mp1.champion_id == champion_id)

    # 3. Requête d'agrégation : On compte les apparitions de mp2 et les victoires de mp1
    q = select(
        mp2.position,
        mp2.champion_id,
        func.count().label("games_played"),
        func.sum(case((mp1.win == True, 1), else_=0)).label("wins")
    ).join(
        mp2, mp1.match_id == mp2.match_id
    )

    # 4. Jointure optionnelle sur la table Match pour filtrer par Patch
    if patch != "ALL":
        q = q.join(match_table, mp1.match_id == match_table.match_id)
        q = q.where(match_table.game_version.startswith(patch))

    # 5. Application des règles métier : Alliés (Synergies) vs Adversaires (Matchups)
    if type == "SYNERGIES":
        q = q.where(and_(
            mp1.team_id == mp2.team_id,
            mp1.puuid != mp2.puuid # On exclut le joueur lui-même
        ))
    else: # MATCHUPS
        q = q.where(mp1.team_id != mp2.team_id)

    q = q.where(*conditions)
    q = q.group_by(mp2.position, mp2.champion_id)

    result = await db.execute(q)
    rows = result.all()

    # 6. Formatage de sortie compatible avec le dictionnaire attendu par le Frontend
    data = {"TOP": [], "JUNGLE": [], "MIDDLE": [], "BOTTOM": [], "UTILITY": []}
    
    for row in rows:
        pos = row.position
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
        
    # Tri métier : Les champions les plus rencontrés en premier, puis le winrate
    for pos in data:
        data[pos].sort(key=lambda x: (x["gamesPlayed"], x["winrate"]), reverse=True)

    return data