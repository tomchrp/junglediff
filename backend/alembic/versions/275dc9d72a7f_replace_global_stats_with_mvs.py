"""
===============================================================================
FICHIER : backend/alembic/versions/XXXX_replace_global_stats_with_mvs.py
PROJET  : JungleDiff

DESCRIPTION :
Migration structurelle majeure.
1. Destruction de la table d'agrégation plate `global_champion_time_stats`.
2. Création de deux vues matérialisées (Materialized Views) pour séparer
   physiquement et sémantiquement les Matchups (ennemis) des Synergies (alliés).
3. Création d'index uniques composites sur ces vues. C'est le prérequis
   absolu de PostgreSQL pour autoriser un rafraîchissement non bloquant
   (REFRESH MATERIALIZED VIEW CONCURRENTLY) en production.
===============================================================================
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '275dc9d72a7f'
down_revision: Union[str, Sequence[str], None] = '6aef2b807f38'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    """
    Exécute la migration vers l'avant : destruction de la table historique
    et création des vues matérialisées avec indexation pour rafraîchissement à chaud.
    """
    # 1. Suppression de l'ancienne table
    op.drop_table('global_champion_time_stats')

    # 2. Création de la Vue Matérialisée : MATCHUPS (Ennemis)
    op.execute("""
        CREATE MATERIALIZED VIEW mv_community_matchups AS
        SELECT
            p1.champion_id AS subject_champion_id,
            p1.lane AS subject_lane,
            p2.champion_id AS target_champion_id,
            p2.lane AS target_lane,
            CAST(FLOOR(m.game_duration / 300.0) * 5 AS INTEGER) AS duration_bucket,
            CAST(COUNT(*) AS INTEGER) AS matches_count,
            CAST(SUM(CASE WHEN p1.win THEN 1 ELSE 0 END) AS INTEGER) AS wins_count
        FROM match_participants p1
        JOIN match_participants p2 ON p1.match_id = p2.match_id
        JOIN matches m ON p1.match_id = m.match_id
        WHERE p1.team_id != p2.team_id
        AND m.game_duration > 0
        GROUP BY p1.champion_id, p1.lane, p2.champion_id, p2.lane, CAST(FLOOR(m.game_duration / 300.0) * 5 AS INTEGER);
    """)

    # 3. Création de la Vue Matérialisée : SYNERGIES (Alliés)
    # Note : On exclut p1.puuid = p2.puuid pour éviter de calculer la synergie du joueur avec lui-même
    op.execute("""
        CREATE MATERIALIZED VIEW mv_community_synergies AS
        SELECT
            p1.champion_id AS subject_champion_id,
            p1.lane AS subject_lane,
            p2.champion_id AS target_champion_id,
            p2.lane AS target_lane,
            CAST(FLOOR(m.game_duration / 300.0) * 5 AS INTEGER) AS duration_bucket,
            CAST(COUNT(*) AS INTEGER) AS matches_count,
            CAST(SUM(CASE WHEN p1.win THEN 1 ELSE 0 END) AS INTEGER) AS wins_count
        FROM match_participants p1
        JOIN match_participants p2 ON p1.match_id = p2.match_id
        JOIN matches m ON p1.match_id = m.match_id
        WHERE p1.team_id = p2.team_id
        AND p1.puuid != p2.puuid
        AND m.game_duration > 0
        GROUP BY p1.champion_id, p1.lane, p2.champion_id, p2.lane, CAST(FLOOR(m.game_duration / 300.0) * 5 AS INTEGER);
    """)

    # 4. Création des Index Uniques (Obligatoire pour CONCURRENTLY)
    op.execute("""
        CREATE UNIQUE INDEX idx_mv_matchups_unique 
        ON mv_community_matchups (subject_champion_id, subject_lane, target_champion_id, target_lane, duration_bucket);
    """)
    op.execute("""
        CREATE UNIQUE INDEX idx_mv_synergies_unique 
        ON mv_community_synergies (subject_champion_id, subject_lane, target_champion_id, target_lane, duration_bucket);
    """)


def downgrade():
    """
    Restauration de l'état précédent en cas d'erreur ou de rollback.
    Détruit les vues matérialisées et recrée la table d'origine.
    """
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_community_matchups;")
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_community_synergies;")

    op.create_table(
        'global_champion_time_stats',
        sa.Column('champion_id', sa.Integer(), nullable=False),
        sa.Column('lane', sa.String(), nullable=False),
        sa.Column('duration_bucket', sa.Integer(), nullable=False),
        sa.Column('matches_count', sa.Integer(), nullable=False, default=0),
        sa.Column('wins_count', sa.Integer(), nullable=False, default=0),
        sa.PrimaryKeyConstraint('champion_id', 'lane', 'duration_bucket')
    )
    op.create_index(op.f('ix_global_champion_time_stats_champion_id'), 'global_champion_time_stats', ['champion_id'], unique=False)
    op.create_index(op.f('ix_global_champion_time_stats_lane'), 'global_champion_time_stats', ['lane'], unique=False)