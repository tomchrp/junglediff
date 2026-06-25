"""
===============================================================================
FICHIER : backend/app/db/models.py
PROJET  : JungleDiff

DESCRIPTION :
Définition du schéma relationnel de la base de données via SQLAlchemy.
Inclut les métadonnées globales des joueurs (icône, rang, LP récupérés via 
Summoner V4 et League V4) et le stockage des données hybrides pour les matchs
(données chaudes indexées pour les requêtes rapides, et JSONB trimmé pour le 
stockage à froid et les futures analyses).
===============================================================================
"""

from sqlalchemy import Column, String, Integer, BigInteger, Boolean, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Player(Base):
    """
    Table centrale identifiant un joueur.
    Stocke les identifiants Riot et les données de classement mises à jour 
    lors de la synchronisation (Ingestion différentielle).
    """
    __tablename__ = "players"

    puuid = Column(String, primary_key=True, index=True)
    summoner_id = Column(String, index=True, nullable=True)
    riot_id_name = Column(String, nullable=False)
    riot_id_tagline = Column(String, nullable=False)
    
    # Statistiques de profil (PlayerStatCard)
    profile_icon_id = Column(Integer, nullable=True)
    summoner_level = Column(Integer, nullable=True)
    tier = Column(String, nullable=True) # Ex: DIAMOND
    rank = Column(String, nullable=True) # Ex: II
    league_points = Column(Integer, nullable=True)
    
    last_update_timestamp = Column(BigInteger, nullable=True)
    
    # Relation
    match_participations = relationship("MatchParticipant", back_populates="player")


class Match(Base):
    """Table stockant les métadonnées de la partie et le JSON élagué."""
    __tablename__ = "matches"

    match_id = Column(String, primary_key=True, index=True)
    game_version = Column(String, nullable=False, index=True)
    game_duration = Column(Integer, nullable=False)
    creation_timestamp = Column(BigInteger, nullable=False)
    
    # Données froides TRIMMÉES (très légères par rapport au payload Riot brut)
    raw_match_data = Column(JSONB, nullable=False)

    participants = relationship("MatchParticipant", back_populates="match")
    timeline = relationship("MatchTimeline", back_populates="match", uselist=False)


class MatchParticipant(Base):
    """Table de liaison. Indexée pour les calculs d'agrégation de la Sidebar."""
    __tablename__ = "match_participants"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(String, ForeignKey("matches.match_id", ondelete="CASCADE"), nullable=False)
    puuid = Column(String, ForeignKey("players.puuid", ondelete="CASCADE"), nullable=False)
    
    team_id = Column(Integer, nullable=False)
    champion_id = Column(Integer, nullable=False)
    lane = Column(String, nullable=False)
    position = Column(String, nullable=False)
    win = Column(Boolean, nullable=False)
    kills = Column(Integer, nullable=False)
    deaths = Column(Integer, nullable=False)
    assists = Column(Integer, nullable=False)

    player = relationship("Player", back_populates="match_participations")
    match = relationship("Match", back_populates="participants")

    __table_args__ = (
        UniqueConstraint('match_id', 'puuid', name='uix_match_puuid'),
        Index('ix_participant_filter', 'puuid', 'position', 'champion_id'),
    )


class MatchTimeline(Base):
    """Stockage exclusif des événements et frames trimmés de la timeline."""
    __tablename__ = "match_timelines"

    match_id = Column(String, ForeignKey("matches.match_id", ondelete="CASCADE"), primary_key=True)
    raw_timeline_data = Column(JSONB, nullable=False)

    match = relationship("Match", back_populates="timeline")