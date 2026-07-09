"""
===============================================================================
FICHIER : backend/app/db/models.py
PROJET  : JungleDiff

DESCRIPTION :
Définition du schéma relationnel de la base de données via SQLAlchemy.
Inclut les métadonnées globales des joueurs, le stockage hybride des matchs,
et les nouvelles tables de persistance pour l'orchestration du Crawler Big Data.

MODIFICATIONS (PHASE 1 - OPTIMISATION BIG DATA) :
- Ajout de `details_version` et `timeline_version` dans la table Match pour 
  garantir l'idempotence absolue des scripts de backfill.
- Ajout de `aggregated_metrics` (JSONB) dans CrawlerState pour stocker les 
  compteurs en temps réel et tuer les requêtes COUNT(*) du dashboard.
- Création de `CrawlerSummonerQueue` : File d'attente d'atténuation du Rate Limit
  dédiée à la traduction asynchrone des SummonerId (League-V4) en PUUID.
===============================================================================
"""

from sqlalchemy import Column, String, Integer, BigInteger, Boolean, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

# =============================================================================
# MODÈLES DE DONNÉES APPLICATIFS (JOUABILITÉ ET ANALYSE)
# =============================================================================

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
    
    # Statistiques de profil
    profile_icon_id = Column(Integer, nullable=True)
    summoner_level = Column(Integer, nullable=True)
    tier = Column(String, nullable=True)
    rank = Column(String, nullable=True)
    league_points = Column(Integer, nullable=True)
    
    last_update_timestamp = Column(BigInteger, nullable=True)
    
    match_participations = relationship("MatchParticipant", back_populates="player")


class Match(Base):
    """
    Table stockant les métadonnées de la partie et le JSON élagué.
    Le flag `is_crawled` agit comme un coupe-circuit strict pour empêcher
    les workers ARQ de saturer l'API Riot en tentant de télécharger la timeline.
    """
    __tablename__ = "matches"

    match_id = Column(String, primary_key=True, index=True)
    game_version = Column(String, nullable=False, index=True)
    game_duration = Column(Integer, nullable=False)
    creation_timestamp = Column(BigInteger, nullable=False)
    
    # FLAG DE SÉCURITÉ BIG DATA
    is_crawled = Column(Boolean, nullable=False, server_default='false', default=False)
    
    # FLAG DE RÉSOLUTION TIMELINE (Protection contre les 404 de Riot)
    timeline_status = Column(String, nullable=False, server_default='PENDING', default='PENDING')
    
    # VERSIONNING BACKFILL (Garantit l'idempotence des passages de scripts)
    details_version = Column(Integer, nullable=False, server_default='0', default=0)
    timeline_version = Column(Integer, nullable=False, server_default='0', default=0)
    
    # Données froides TRIMMÉES
    raw_match_data = Column(JSONB, nullable=False)

    participants = relationship("MatchParticipant", back_populates="match")
    timeline = relationship("MatchTimeline", back_populates="match", uselist=False)


class MatchParticipant(Base):
    """Table de liaison. Indexée pour les calculs d'agrégation de la Sidebar et Synergies."""
    __tablename__ = "match_participants"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(String, ForeignKey("matches.match_id", ondelete="CASCADE"), nullable=False)
    puuid = Column(String, ForeignKey("players.puuid", ondelete="CASCADE"), nullable=False)
    
    team_id = Column(Integer, nullable=False)
    champion_id = Column(Integer, nullable=False)
    lane = Column(String, nullable=False)
    win = Column(Boolean, nullable=False)
    kills = Column(Integer, nullable=False)
    deaths = Column(Integer, nullable=False)
    assists = Column(Integer, nullable=False)

    # MÉTRIQUES BIG DATA (Calculées au passage du Trimmer)
    gold_diff_15m = Column(Integer, nullable=True)
    xp_diff_15m = Column(Integer, nullable=True)
    is_snowballing = Column(Boolean, nullable=True)

    # MÉTRIQUES SPATIALES (Jungle Pathing - Minutes 1, 2 et 3)
    pos_f1_x = Column(Integer, nullable=True)
    pos_f1_y = Column(Integer, nullable=True)
    pos_f2_x = Column(Integer, nullable=True)
    pos_f2_y = Column(Integer, nullable=True)
    pos_f3_x = Column(Integer, nullable=True)
    pos_f3_y = Column(Integer, nullable=True)

    player = relationship("Player", back_populates="match_participations")
    match = relationship("Match", back_populates="participants")

    __table_args__ = (
        UniqueConstraint('match_id', 'puuid', name='uix_match_puuid'),
        Index('ix_participant_filter', 'puuid', 'champion_id'),
    )


class MatchTimeline(Base):
    """Stockage exclusif des événements et frames trimmés de la timeline."""
    __tablename__ = "match_timelines"

    match_id = Column(String, ForeignKey("matches.match_id", ondelete="CASCADE"), primary_key=True)
    raw_timeline_data = Column(JSONB, nullable=False)

    match = relationship("Match", back_populates="timeline")


# =============================================================================
# MODÈLES D'ÉTAT DU CRAWLER BIG DATA
# =============================================================================

class CrawlerSummonerQueue(Base):
    """
    File d'attente persistante pour la traduction des Summoner IDs en PUUIDs (League-V4 -> Summoner-V4).
    Absorbe le choc du Rate Limit de l'API Riot lors du Snowballing de masse par division.
    """
    __tablename__ = "crawler_summoner_queue"
    
    summoner_id = Column(String, primary_key=True, index=True)
    tier = Column(String, nullable=False) # Ex: DIAMOND
    rank = Column(String, nullable=False) # Ex: II
    status = Column(String, nullable=False, default="PENDING", index=True) # PENDING, PROCESSING, COMPLETED, FAILED
    discovered_at = Column(BigInteger, nullable=False)


class CrawlerQueue(Base):
    """
    File d'attente persistante des joueurs découverts.
    Gère la propagation en largeur (Snowballing) avec une limite de profondeur.
    """
    __tablename__ = "crawler_queue"
    
    puuid = Column(String, primary_key=True, index=True)
    status = Column(String, nullable=False, default="PENDING", index=True) # PENDING, PROCESSING, COMPLETED, FAILED
    discovery_depth = Column(Integer, nullable=False, default=0)
    discovered_at = Column(BigInteger, nullable=False)


class CrawlerMatchQueue(Base):
    """
    File d'attente persistante des Matchs identifiés à télécharger.
    Permet de résister aux coupures brutales de l'application.
    """
    __tablename__ = "crawler_match_queue"
    
    match_id = Column(String, primary_key=True, index=True)
    status = Column(String, nullable=False, default="PENDING", index=True) # PENDING, PROCESSING, COMPLETED, FAILED
    discovered_at = Column(BigInteger, nullable=False)


class CrawlerState(Base):
    """
    Table de type Singleton (Une seule ligne, id=1).
    Panneau de contrôle central et stockage des compteurs de télémétrie pré-calculés.
    """
    __tablename__ = "crawler_state"
    
    id = Column(Integer, primary_key=True) # Toujours 1
    is_active = Column(Boolean, nullable=False, default=False)
    
    crawler_mode = Column(String, nullable=False, default="DISCOVERY_AND_DETAILS")
    
    total_requests_made = Column(Integer, nullable=False, default=0)
    current_rate_limit_sleep = Column(Integer, nullable=False, default=0)
    started_at = Column(BigInteger, nullable=True)
    
    # COMPTEURS AGRÉGÉS BIG DATA
    # Stocke sous format JSON : {"details_crawled": 0, "timelines_crawled": 0, "queues": {"420": 0}}
    aggregated_metrics = Column(JSONB, nullable=False, server_default='{}', default=dict)

# =============================================================================
# VUES MATÉRIALISÉES
# =============================================================================

class MVCommunityMatchups(Base):
    __tablename__ = "mv_community_matchups"
    __table_args__ = {'info': dict(is_view=True)}

    subject_champion_id = Column(Integer, primary_key=True)
    subject_lane = Column(String, primary_key=True)
    target_champion_id = Column(Integer, primary_key=True)
    target_lane = Column(String, primary_key=True)
    duration_bucket = Column(Integer, primary_key=True) 

    matches_count = Column(Integer, nullable=False)
    wins_count = Column(Integer, nullable=False)


class MVCommunitySynergies(Base):
    __tablename__ = "mv_community_synergies"
    __table_args__ = {'info': dict(is_view=True)}

    subject_champion_id = Column(Integer, primary_key=True)
    subject_lane = Column(String, primary_key=True)
    target_champion_id = Column(Integer, primary_key=True)
    target_lane = Column(String, primary_key=True)
    duration_bucket = Column(Integer, primary_key=True) 

    matches_count = Column(Integer, nullable=False)
    wins_count = Column(Integer, nullable=False)