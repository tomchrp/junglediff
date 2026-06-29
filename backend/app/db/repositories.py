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
from typing import List, Dict, Any, Optional, Tuple

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
        """
        stmt = (
            select(
                MatchParticipant.champion_id,
                func.count(MatchParticipant.match_id).label("games_played"),
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

    async def get_available_patches(self, puuid: str) -> List[str]:
        """
        Obligatoire pour éviter une erreur 500 sur la route /{puuid}/patches.
        Extrait de manière dynamique la liste des patchs disponibles pour un joueur.
        """
        stmt = (
            select(Match.game_version)
            .join(MatchParticipant, Match.match_id == MatchParticipant.match_id)
            .where(MatchParticipant.puuid == puuid)
            .distinct()
        )
        result = await self.db.execute(stmt)
        raw_versions = result.scalars().all()
        
        patches = set()
        for version in raw_versions:
            if version and version != "Unknown":
                parts = version.split('.')
                if len(parts) >= 2:
                    patches.add(f"{parts[0]}.{parts[1]}")
        
        def sort_key(patch_str):
            try:
                major, minor = map(int, patch_str.split('.'))
                return (major, minor)
            except ValueError:
                return (0, 0)
        
        return sorted(list(patches), key=sort_key, reverse=True)

    async def get_match_history_paginated(
        self, 
        puuid: str, 
        end_time: Optional[int] = None, 
        limit: int = 10, 
        lane: Optional[str] = None, 
        champion_id: Optional[int] = None,
        patch: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], bool]:
        """
        Récupère les blocs de match pour l'historique avec pagination temporelle.
        Utilise l'astuce algorithmique du `limit + 1` pour déterminer si des parties 
        plus anciennes existent encore en base locale sans exécuter de fonction COUNT()
        très lourde en ressources.
        
        Retourne un tuple contenant la liste des matchs (max: limit) et un booléen
        indiquant s'il reste des parties locales pour les filtres actifs.
        """
        stmt = (
            select(Match.raw_match_data)
            .join(MatchParticipant, Match.match_id == MatchParticipant.match_id)
            .where(MatchParticipant.puuid == puuid)
        )

        if end_time:
            stmt = stmt.where(Match.creation_timestamp < end_time)

        if lane and lane.upper() != "ALL":
            stmt = stmt.where(MatchParticipant.position == lane.upper())
            
        if champion_id:
            stmt = stmt.where(MatchParticipant.champion_id == champion_id)

        if patch and patch.upper() != "ALL":
            stmt = stmt.where(Match.game_version.like(f"{patch}%"))

        # On demande 11 parties au lieu de 10 pour vérifier l'existence d'une page suivante
        stmt = stmt.order_by(desc(Match.creation_timestamp)).limit(limit + 1)

        result = await self.db.execute(stmt)
        
        matches = [row[0] for row in result.all()]
        
        has_more = len(matches) > limit
        if has_more:
            matches = matches[:limit]
            
        return matches, has_more
    
    async def get_match_spell_casts(self, puuid: str, match_id: str) -> dict:
        query = select(Match.raw_match_data).where(Match.match_id == match_id)
        result = await self.db.execute(query)
        raw_data = result.scalar_one_or_none()

        if not raw_data:
            return {"erreur": "La partie demandée est introuvable."}

        participants = raw_data.get("info", {}).get("participants", [])
        
        # Dictionnaire de traduction des sorts Riot Games
        SUMMONER_MAP = {
            1: "Purge (Cleanse)", 3: "Fatigue (Exhaust)", 4: "Saut Éclair (Flash)",
            6: "Fantôme (Ghost)", 7: "Soin (Heal)", 11: "Châtiment (Smite)",
            12: "Téléportation", 14: "Embrasement (Ignite)", 21: "Barrière"
        }
        
        for participant in participants:
            if participant.get("puuid") == puuid:
                s1_id = participant.get("summoner1Id")
                s2_id = participant.get("summoner2Id")
                
                return {
                    # Champs sémantiques ajoutés pour l'analyse IA
                    "championJoue": participant.get("championName", "Inconnu"),
                    "roleJoue": participant.get("teamPosition", "Inconnu"),
                    "nom_sort_invocateur_1": SUMMONER_MAP.get(s1_id, f"Sort {s1_id}"),
                    "nom_sort_invocateur_2": SUMMONER_MAP.get(s2_id, f"Sort {s2_id}"),
                    
                    # Champs bruts conservés pour l'hydratation du SpellWidget React
                    "championId": participant.get("championId"),
                    "spell1Casts": participant.get("spell1Casts", 0),
                    "spell2Casts": participant.get("spell2Casts", 0),
                    "spell3Casts": participant.get("spell3Casts", 0),
                    "spell4Casts": participant.get("spell4Casts", 0),
                    "summoner1Casts": participant.get("summoner1Casts", 0),
                    "summoner2Casts": participant.get("summoner2Casts", 0)
                }

        return {"erreur": "Le joueur spécifié n'a pas été trouvé."}