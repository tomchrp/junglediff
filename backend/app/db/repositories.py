"""
===============================================================================
FICHIER : backend/app/db/repositories.py
PROJET  : JungleDiff

DESCRIPTION :
Ce fichier contient les classes Repository (Data Access Objects). Il isole la 
logique des requêtes SQL (SQLAlchemy) du reste de l'application. 
Il inclut la logique d'Upsert (insertion ou mise à jour silencieuse) pour 
garantir l'idempotence de l'ingestion, ainsi qu'un exemple de requête 
d'auto-jointure pour la future vue des synergies.
===============================================================================
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import select, and_
from app.db.models import Player, Match, MatchParticipant

class PlayerRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def upsert_player(self, puuid: str, game_name: str, tagline: str):
        """
        Insère un joueur ou met à jour son Riot ID s'il a changé.
        Utilise la clause ON CONFLICT de PostgreSQL pour garantir l'idempotence.
        """
        stmt = insert(Player).values(
            puuid=puuid,
            riot_id_name=game_name,
            riot_id_tagline=tagline
        ).on_conflict_do_update(
            index_elements=['puuid'],
            set_=dict(riot_id_name=game_name, riot_id_tagline=tagline)
        )
        await self.session.execute(stmt)
        await self.session.commit()

class MatchRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_synergies(self, puuid: str, my_lane: str, ally_lane: str, patch: str):
        """
        Exécute une auto-jointure (Self-Join) sur la table MatchParticipant pour
        trouver les statistiques croisées entre deux positions dans la même équipe.
        
        Args:
            puuid: Identifiant du joueur analysé.
            my_lane: La position du joueur (ex: 'JUNGLE').
            ally_lane: La position de l'allié analysé (ex: 'MIDDLE').
            patch: Version du jeu pour filtrer les résultats pertinents.
            
        Returns:
            Une liste de tuples contenant les champions alliés et les résultats.
        """
        # Alias pour différencier le joueur ciblé de son allié
        from sqlalchemy.orm import aliased
        Me = aliased(MatchParticipant)
        Ally = aliased(MatchParticipant)
        
        stmt = (
            select(Ally.champion_id, Me.win)
            .join(Ally, and_(
                Me.match_id == Ally.match_id,
                Me.team_id == Ally.team_id,
                Ally.lane == ally_lane
            ))
            .join(Match, Me.match_id == Match.match_id)
            .where(
                Me.puuid == puuid,
                Me.lane == my_lane,
                Match.game_version.like(f"{patch}%")
            )
        )
        result = await self.session.execute(stmt)
        return result.all()