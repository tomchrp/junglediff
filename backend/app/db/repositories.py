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

from sqlalchemy import select, func, desc, cast, Integer, text
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

async def get_global_duos(db: AsyncSession, primary_lane: str, secondary_lane: str):
    """
    Extrait les duos globaux depuis la vue matérialisée et calcule le delta de synergie.
    
    Cette fonction utilise des Common Table Expressions (CTE) en SQL brut pour :
    1. Agréger le winrate individuel de chaque champion sur sa lane respective.
    2. Agréger le winrate spécifique du duo ciblé.
    3. Joindre les deux ensembles pour calculer le Delta (Winrate Duo - Moyenne des Winrates Individuels).
    
    La gestion du paramètre 'ALL' permet de chercher les duos d'une lane avec le reste de la carte.
    """
    
    # Construction dynamique de la clause WHERE selon la présence du filtre secondaire
    if secondary_lane == "ALL":
        where_clause = "(subject_lane = :primary OR target_lane = :primary)"
    else:
        where_clause = """
            ((subject_lane = :primary AND target_lane = :secondary) 
            OR (subject_lane = :secondary AND target_lane = :primary))
        """

    query = f"""
        WITH champ_stats AS (
            SELECT 
                subject_champion_id AS champ_id,
                subject_lane AS lane,
                CAST(SUM(wins_count) AS FLOAT) / NULLIF(SUM(matches_count), 0) AS winrate
            FROM mv_community_synergies
            GROUP BY subject_champion_id, subject_lane
        ),
        duo_stats AS (
            SELECT 
                subject_champion_id AS champ_a,
                subject_lane AS lane_a,
                target_champion_id AS champ_b,
                target_lane AS lane_b,
                SUM(matches_count) AS total_matches,
                CAST(SUM(wins_count) AS FLOAT) / NULLIF(SUM(matches_count), 0) AS duo_wr
            FROM mv_community_synergies
            WHERE {where_clause}
            GROUP BY subject_champion_id, subject_lane, target_champion_id, target_lane
        )
        SELECT 
            d.champ_a,
            d.lane_a,
            d.champ_b,
            d.lane_b,
            d.total_matches,
            d.duo_wr,
            c_a.winrate AS wr_a,
            c_b.winrate AS wr_b,
            (d.duo_wr - ((c_a.winrate + c_b.winrate) / 2.0)) AS synergy_delta
        FROM duo_stats d
        JOIN champ_stats c_a ON d.champ_a = c_a.champ_id AND d.lane_a = c_a.lane
        JOIN champ_stats c_b ON d.champ_b = c_b.champ_id AND d.lane_b = c_b.lane
        ORDER BY d.total_matches DESC
        LIMIT 300;
    """
    
    # Le LIMIT 300 protège la mémoire du frontend sans brider l'analyse de faible volume en DB.
    result = await db.execute(text(query), {"primary": primary_lane, "secondary": secondary_lane})
    
    return [dict(row._mapping) for row in result]


async def get_duo_timeline(db: AsyncSession, champ_a: int, lane_a: str, champ_b: int, lane_b: str):
    """
    Récupère l'évolution du winrate d'un duo précis en fonction de la durée de jeu.
    
    Interroge la vue matérialisée en conservant le regroupement par 'duration_bucket' 
    (tranches de 5 minutes) pour alimenter le graphique Recharts de la console.
    """
    query = """
        SELECT 
            duration_bucket,
            SUM(matches_count) as total_matches,
            CAST(SUM(wins_count) AS FLOAT) / NULLIF(SUM(matches_count), 0) as winrate
        FROM mv_community_synergies
        WHERE 
            (subject_champion_id = :c_a AND subject_lane = :l_a AND target_champion_id = :c_b AND target_lane = :l_b)
            OR 
            (subject_champion_id = :c_b AND subject_lane = :l_b AND target_champion_id = :c_a AND target_lane = :l_a)
        GROUP BY duration_bucket
        ORDER BY duration_bucket ASC;
    """
    
    result = await db.execute(text(query), {
        "c_a": champ_a, "l_a": lane_a,
        "c_b": champ_b, "l_b": lane_b
    })
    
    return [dict(row._mapping) for row in result]