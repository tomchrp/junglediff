"""
===============================================================================
FICHIER : backend/app/db/models.py
PROJET  : JungleDiff

DESCRIPTION :
Définition du schéma relationnel de la base de données. 
Implémente le dédoublonnage strict des parties et l'indexation composite
nécessaire pour les requêtes complexes (comme les auto-jointures de la vue 
Synergies). Utilise le type JSONB pour stocker les payloads de l'API Riot 
sans perdre d'information (données froides).
===============================================================================
"""

from sqlalchemy import Column, String, Integer, BigInteger, Boolean, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Player(Base):
    """Table centrale identifiant un joueur de manière unique au monde."""
    __tablename__ = "players"

    puuid = Column(String, primary_key=True, index=True)
    riot_id_name = Column(String, nullable=False)
    riot_id_tagline = Column(String, nullable=False)
    
    # Relation bidirectionnelle
    match_participations = relationship("MatchParticipant", back_populates="player")


class Match(Base):
    """Table stockant les métadonnées uniques d'une partie et le payload brut."""
    __tablename__ = "matches"

    # match_id contient déjà la région, ex: 'EUW1_123456789'
    match_id = Column(String, primary_key=True, index=True)
    game_version = Column(String, nullable=False, index=True) # Ex: '14.12.555.1234'
    game_duration = Column(Integer, nullable=False)
    creation_timestamp = Column(BigInteger, nullable=False)
    
    # Données froides : payload JSON V5 complet pour traitement futur
    raw_match_data = Column(JSONB, nullable=False)

    # Relations
    participants = relationship("MatchParticipant", back_populates="match")
    timeline = relationship("MatchTimeline", back_populates="match", uselist=False)


class MatchParticipant(Base):
    """
    Table de liaison cruciale. C'est ici que se trouvent les données chaudes.
    Elle fait le pont entre un Player et un Match.
    """
    __tablename__ = "match_participants"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(String, ForeignKey("matches.match_id", ondelete="CASCADE"), nullable=False)
    puuid = Column(String, ForeignKey("players.puuid", ondelete="CASCADE"), nullable=False)
    
    # Métriques critiques pour les filtres et requêtes rapides
    team_id = Column(Integer, nullable=False) # 100 (Bleu) ou 200 (Rouge)
    champion_id = Column(Integer, nullable=False)
    lane = Column(String, nullable=False) # Ex: 'JUNGLE', 'MIDDLE'
    position = Column(String, nullable=False)
    win = Column(Boolean, nullable=False)
    kills = Column(Integer, nullable=False)
    deaths = Column(Integer, nullable=False)
    assists = Column(Integer, nullable=False)

    # Relations
    player = relationship("Player", back_populates="match_participations")
    match = relationship("Match", back_populates="participants")

    # Contrainte d'unicité : un joueur ne peut pas être deux fois dans la même partie
    __table_args__ = (
        UniqueConstraint('match_id', 'puuid', name='uix_match_puuid'),
        # Index composite vital pour la rapidité des requêtes Synergies et Clear
        Index('ix_participant_filter', 'puuid', 'lane', 'champion_id'),
    )


class MatchTimeline(Base):
    """
    Séparation structurelle de la timeline pour ne pas alourdir la table Match.
    Ne contient que le payload JSON brut de l'API Timeline.
    """
    __tablename__ = "match_timelines"

    match_id = Column(String, ForeignKey("matches.match_id", ondelete="CASCADE"), primary_key=True)
    raw_timeline_data = Column(JSONB, nullable=False)

    match = relationship("Match", back_populates="timeline")