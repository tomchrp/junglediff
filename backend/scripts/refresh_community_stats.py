# backend/scripts/refresh_community_stats.py

"""
===============================================================================
FICHIER : backend/scripts/refresh_community_stats.py
PROJET  : JungleDiff

DESCRIPTION :
Script ETL (Extract, Transform, Load) autonome. 
Il a pour rôle de recalculer l'entièreté des statistiques communautaires basées 
sur le temps. Il vide la table d'agrégation `global_champion_time_stats` puis 
exécute une requête de regroupement massive sur les données transactionnelles 
historiques.

MODIFICATIONS :
- Correction des noms de tables dans la requête SQL brute (`match_participants` 
  au lieu de `matchparticipant`, `matches` au lieu de `match`) pour correspondre
  au schéma SQLAlchemy.
- Séparation des instructions SQL (TRUNCATE et INSERT) en deux appels distincts
  pour respecter les contraintes strictes du driver asynchrone asyncpg.
===============================================================================
"""

import asyncio
import logging
import sys
import os
from sqlalchemy import text

# Ajustement du path pour permettre l'exécution en ligne de commande depuis la racine du backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import AsyncSessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("RefreshCommunityStats")

async def refresh_global_stats():
    """
    Exécute la purge et le repeuplement de la table d'agrégation globale.
    
    Déroulement :
    1. Exécute un TRUNCATE pour vider la table cible instantanément.
    2. Exécute un INSERT ... SELECT pour croiser les tables `match_participants` et `matches`.
    3. Utilise FLOOR(game_duration / 300) * 5 pour regrouper par fenêtres de 5 minutes.
    """
    logger.info("Début du rafraîchissement des statistiques communautaires globales...")

    sql_truncate = text("TRUNCATE TABLE global_champion_time_stats;")
    
    # Correction stricte des noms de tables : match_participants et matches
    sql_insert = text("""
        INSERT INTO global_champion_time_stats (champion_id, lane, duration_bucket, matches_count, wins_count)
        SELECT
            mp.champion_id,
            mp.lane,
            CAST(FLOOR(m.game_duration / 300.0) * 5 AS INTEGER) AS duration_bucket,
            CAST(COUNT(*) AS INTEGER) AS matches_count,
            CAST(SUM(CASE WHEN mp.win THEN 1 ELSE 0 END) AS INTEGER) AS wins_count
        FROM match_participants mp
        JOIN matches m ON mp.match_id = m.match_id
        WHERE m.game_duration > 0
        GROUP BY mp.champion_id, mp.lane, CAST(FLOOR(m.game_duration / 300.0) * 5 AS INTEGER);
    """)

    try:
        async with AsyncSessionLocal() as session:
            # L'exécution doit être séquentielle et séparée pour le driver asyncpg
            await session.execute(sql_truncate)
            await session.execute(sql_insert)
            
            # Commit global de la transaction
            await session.commit()
            logger.info("Rafraîchissement terminé avec succès. Les données communautaires sont à jour.")
    except Exception as e:
        logger.error(f"Erreur critique lors de l'agrégation des données : {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(refresh_global_stats())