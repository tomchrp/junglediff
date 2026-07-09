"""
===============================================================================
FICHIER : backend/alembic/versions/11b9a1613400_optimisation_big_data_phase1.py
PROJET  : JungleDiff

DESCRIPTION :
Fichier de migration Alembic pour la Phase 1 de l'optimisation Big Data.
Ajoute les versions de parse pour le backfill, la file d'attente des summoners
pour le respect du Rate Limit, et le cache d'agrégation des métriques.
ATTENTION : Les instructions de création de tables pour les vues matérialisées
générées automatiquement par Alembic ont été purgées de ce fichier pour ne pas
corrompre le schéma relationnel.
Les server_default utilisent un cast SQL strict pour éviter les erreurs sur les tables peuplées.
===============================================================================

Revision ID: 11b9a1613400
Revises: 87239a156b6a
Create Date: 2026-07-09 20:25:11.489329

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '11b9a1613400'
down_revision: Union[str, Sequence[str], None] = '87239a156b6a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Met à jour le schéma de base de données.
    Ajoute la table crawler_summoner_queue et les nouvelles colonnes
    d'état et de versionning sur crawler_state et matches.
    """
    op.create_table('crawler_summoner_queue',
    sa.Column('summoner_id', sa.String(), nullable=False),
    sa.Column('tier', sa.String(), nullable=False),
    sa.Column('rank', sa.String(), nullable=False),
    sa.Column('status', sa.String(), nullable=False),
    sa.Column('discovered_at', sa.BigInteger(), nullable=False),
    sa.PrimaryKeyConstraint('summoner_id')
    )
    op.create_index(op.f('ix_crawler_summoner_queue_status'), 'crawler_summoner_queue', ['status'], unique=False)
    op.create_index(op.f('ix_crawler_summoner_queue_summoner_id'), 'crawler_summoner_queue', ['summoner_id'], unique=False)
    
    # Cast explicite en ::jsonb pour éviter le typage character varying
    op.add_column('crawler_state', sa.Column('aggregated_metrics', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False))
    
    # Cast explicite des entiers
    op.add_column('matches', sa.Column('details_version', sa.Integer(), server_default=sa.text('0'), nullable=False))
    op.add_column('matches', sa.Column('timeline_version', sa.Integer(), server_default=sa.text('0'), nullable=False))


def downgrade() -> None:
    """
    Annule la migration et restaure l'état précédent du schéma.
    Supprime les colonnes de versionning, d'agrégation et la table des summoners.
    """
    op.drop_column('matches', 'timeline_version')
    op.drop_column('matches', 'details_version')
    op.drop_column('crawler_state', 'aggregated_metrics')
    op.drop_index(op.f('ix_crawler_summoner_queue_summoner_id'), table_name='crawler_summoner_queue')
    op.drop_index(op.f('ix_crawler_summoner_queue_status'), table_name='crawler_summoner_queue')
    op.drop_table('crawler_summoner_queue')