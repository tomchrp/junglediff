"""
===============================================================================
FICHIER : backend/scripts/fix_roles_and_deduplicate.py
PROJET  : JungleDiff

DESCRIPTION :
Script utilitaire (One-off) pour la correction structurelle des rôles.
1. Transfère les données exactes (colonne 'position') vers la colonne 
   historiquement exploitée par l'application ('lane').
2. Détruit définitivement la colonne 'position' de la table pour éliminer 
   la duplication de données dans le Hot Storage.
===============================================================================
"""
import asyncio
import logging
import sys
import os
from sqlalchemy import text

# Ajustement du path pour l'exécution en ligne de commande depuis la racine
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import AsyncSessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FixRoles")

async def execute_db_fix():
    """
    Exécute la migration de données et l'altération du schéma de la base 
    dans une transaction asynchrone sécurisée. Si une erreur survient, 
    un rollback automatique est effectué.
    """
    engine = AsyncSessionLocal.kw['bind']
    
    try:
        async with engine.begin() as conn:
            logger.info("1. Transfert des données de 'position' vers 'lane'...")
            await conn.execute(text(
                "UPDATE match_participants "
                "SET lane = position "
                "WHERE position IS NOT NULL AND position != 'NONE';"
            ))
            
            logger.info("2. Suppression de la colonne redondante 'position'...")
            await conn.execute(text(
                "ALTER TABLE match_participants DROP COLUMN IF EXISTS position;"
            ))
            
        logger.info("Opération terminée avec succès. La base de données est propre et dédoublonnée.")
    except Exception as e:
        logger.error(f"Erreur critique lors de la modification de la base : {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(execute_db_fix())