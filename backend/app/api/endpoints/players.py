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
from sqlalchemy import select, func
from pydantic import BaseModel, Field
from typing import Optional
import time

from app.db.session import get_db
from app.services.sync_service import SyncService
from app.db.repositories import PlayerRepository
from app.db.models import Player, MatchParticipant

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
    """
    repo = PlayerRepository(db)
    player = await repo.get_player_by_puuid(puuid)
    
    if not player:
        raise HTTPException(status_code=404, detail="Joueur introuvable en base de données.")
        
    return {
        "puuid": player.puuid,
        "riotIdGameName": player.riot_id_name,
        "riotIdTagline": player.riot_id_tagline,
        "profileIconId": player.profile_icon_id,
        "summonerLevel": player.summoner_level,
        "tier": player.tier,
        "rank": player.rank,
        "leaguePoints": player.league_points,
        "lastUpdate": player.last_update_timestamp
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

    La logique a été modifiée pour renvoyer systématiquement le nombre de parties 
    actuellement ingérées. Le statut reste 'in_progress' jusqu'à ce que 60 secondes 
    se soient écoulées ou que 60 parties aient été ingérées, permettant au frontend 
    de rafraîchir l'interface progressivement.
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

    # Arrêt du polling si 60s sont passées (timeout sécurité) ou si 60 parties 
    # (le plafond de notre triple appel) sont en base.
    if time_elapsed_ms > 60000 or match_count >= 60:
        return {"status": "completed", "matches_ingested": match_count}

    return {"status": "in_progress", "matches_ingested": match_count}