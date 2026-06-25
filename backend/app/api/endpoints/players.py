"""
===============================================================================
FICHIER : backend/app/api/endpoints/players.py
PROJET  : JungleDiff

DESCRIPTION :
Routeur gérant les interactions liées aux joueurs. Expose la route d'ingestion 
(update) et les routes de lecture (summary, champion-stats) nécessaires à la 
construction de l'interface utilisateur.
===============================================================================
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional

from app.db.session import get_db
from app.services.sync_service import SyncService
from app.db.repositories import PlayerRepository

router = APIRouter()

class PlayerSyncRequest(BaseModel):
    server: str = Field(..., description="Le serveur ciblé (ex: EUW, NA, KR)")
    game_name: str = Field(..., description="Le pseudo Riot du joueur")
    tag_line: str = Field(..., description="Le tag Riot du joueur (sans le #)")

@router.post("/update")
async def update_player_profile(request: PlayerSyncRequest, db: AsyncSession = Depends(get_db)):
    """Route d'ingestion différentielle (Landing)."""
    service = SyncService(db)
    result = await service.sync_player_profile(request.server, request.game_name, request.tag_line)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return result

@router.get("/{puuid}/summary")
async def get_player_summary(puuid: str, db: AsyncSession = Depends(get_db)):
    """
    Renvoie les informations globales du joueur pour la PlayerStatCard (Magenta).
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
    lane: Optional[str] = Query(None, description="Filtrer par rôle (ex: JUNGLE, TOP)"),
    patch: Optional[str] = Query(None, description="Filtrer par patch (ex: 14.12)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Renvoie les statistiques agrégées des champions pour la Sidebar (Rouge/Vert).
    La logique de calcul est déportée sur PostgreSQL.
    """
    repo = PlayerRepository(db)
    stats = await repo.get_champion_stats_sidebar(puuid, lane, patch)
    return {"championStats": stats}