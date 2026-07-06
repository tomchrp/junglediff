"""
===============================================================================
FICHIER : backend/scripts/refresh_community_stats.py
PROJET  : JungleDiff

DESCRIPTION :
Script ETL (Extract, Transform, Load) autonome. 
Ce script a été refondu suite à l'adoption des Vues Matérialisées (Materialized Views).
Il n'effectue plus de requêtes TRUNCATE ni de calculs lourds en mémoire. 
Son unique rôle est d'ordonner à PostgreSQL de rafraîchir les vues matérialisées 
en arrière-plan (CONCURRENTLY), permettant aux utilisateurs de continuer à 
consulter l'application sans aucune interruption de service ni verrouillage de table.

MODIFICATIONS :
- Suppression des requêtes d'insertion manuelles.
- Ajout de l'exécution avec un niveau d'isolation AUTOCOMMIT (Requis par PostgreSQL 
  pour l'instruction CONCURRENTLY qui refuse d'être exécutée dans une transaction).
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
    Déclenche le rafraîchissement à chaud des vues matérialisées d'analyse croisée.
    
    L'utilisation de CONCURRENTLY oblige à contourner le gestionnaire de transaction 
    classique de SQLAlchemy. Nous récupérons le moteur asynchrone sous-jacent et 
    forçons le mode AUTOCOMMIT pour éviter l'erreur PostgreSQL 
    "CONCURRENTLY cannot run inside a transaction block".
    """
    logger.info("Début du rafraîchissement des vues matérialisées (Matchups & Synergies)...")

    # Requêtes de rafraîchissement à chaud
    sql_refresh_matchups = text("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_community_matchups;")
    sql_refresh_synergies = text("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_community_synergies;")

    # Extraction du moteur sous-jacent depuis la fabrique de session
    engine = AsyncSessionLocal.kw['bind']

    try:
        # Ouverture d'une connexion directe hors du bloc transactionnel standard
        async with engine.connect() as conn:
            # Passage de la connexion en AUTOCOMMIT strict
            await conn.execution_options(isolation_level="AUTOCOMMIT")
            
            logger.info("Mise à jour de mv_community_matchups en cours...")
            await conn.execute(sql_refresh_matchups)
            logger.info("Mise à jour de mv_community_matchups terminée.")

            logger.info("Mise à jour de mv_community_synergies en cours...")
            await conn.execute(sql_refresh_synergies)
            logger.info("Mise à jour de mv_community_synergies terminée.")

        logger.info("Rafraîchissement global terminé avec succès. L'application dispose des dernières données.")
    except Exception as e:
        logger.error(f"Erreur critique lors du rafraîchissement des vues : {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(refresh_global_stats())