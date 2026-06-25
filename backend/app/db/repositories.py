"""
===============================================================================
FICHIER : backend/app/db/repositories.py
PROJET  : JungleDiff

DESCRIPTION :
Couche d'accès aux données (Data Access Layer). Concentre les requêtes SQL 
complexes utilisant SQLAlchemy 2.0. Déporte la charge de calcul (agrégations, 
moyennes, tris) sur PostgreSQL pour garantir des temps de réponse minimes au 
frontend React.
===============================================================================
"""

from sqlalchemy import select, func, desc, cast, Integer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional

from app.db.models import Player, MatchParticipant, Match

class PlayerRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_player_by_puuid(self, puuid: str) -> Optional[Player]:
        """Récupère les informations globales d'un joueur."""
        query = select(Player).where(Player.puuid == puuid)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_champion_stats_sidebar(self, puuid: str, lane: Optional[str] = None, patch: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Calcule les statistiques agrégées (Sidebar) pour un joueur.
        Filtre dynamiquement par lane ou patch si spécifié.
        Trie par nombre de parties jouées, puis par winrate.
        """
        stmt = (
            select(
                MatchParticipant.champion_id,
                func.count(MatchParticipant.id).label("games_played"),
                func.sum(cast(MatchParticipant.win, Integer)).label("wins")
            )
            .join(Match, MatchParticipant.match_id == Match.match_id)
            .where(MatchParticipant.puuid == puuid)
        )

        if lane and lane.upper() != "ALL":
            stmt = stmt.where(MatchParticipant.position == lane.upper())
        if patch and patch.upper() != "ALL":
            stmt = stmt.where(Match.game_version.startswith(patch))

        stmt = stmt.group_by(MatchParticipant.champion_id).order_by(
            desc("games_played"), 
            desc("wins")
        )

        result = await self.db.execute(stmt)
        rows = result.all()

        stats = []
        for row in rows:
            games = row.games_played
            wins = row.wins if row.wins is not None else 0
            winrate = round((wins / games) * 100) if games > 0 else 0
            
            stats.append({
                "championId": row.champion_id,
                "gamesPlayed": games,
                "wins": wins,
                "losses": games - wins,
                "winrate": winrate
            })

        return stats

class MatchRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_match_history_paginated(self, puuid: str, end_time: Optional[int] = None, limit: int = 10, lane: Optional[str] = None, champion_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Récupère les blocs de match pour l'historique avec pagination temporelle.
        """
        stmt = (
            select(Match.raw_match_data)
            .join(MatchParticipant, Match.match_id == MatchParticipant.match_id)
            .where(MatchParticipant.puuid == puuid)
        )

        # Remplacement du Offset par le Voyage Temporel (Filtre par date de création)
        if end_time:
            stmt = stmt.where(Match.creation_timestamp < end_time)

        if lane and lane.upper() != "ALL":
            stmt = stmt.where(MatchParticipant.position == lane.upper())
        if champion_id:
            stmt = stmt.where(MatchParticipant.champion_id == champion_id)

        # On garde le tri descendant et la limite
        stmt = stmt.order_by(desc(Match.creation_timestamp)).limit(limit)

        result = await self.db.execute(stmt)
        
        matches = [row[0] for row in result.all()]
        return matches