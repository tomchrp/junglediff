"""
===============================================================================
FICHIER : backend/scripts/backfill_details.py
PROJET  : JungleDiff

DESCRIPTION :
Script de réhydratation asynchrone par lots (Batch) dédié exclusivement
aux détails de matchs (Match Details).
Utilise la Keyset Pagination pour garantir une consommation RAM constante (O(1)),
indépendamment de la taille de la base de données.
Télécharge les JSON bruts depuis MinIO de manière concurrente (asyncio.gather).
Met à jour la version de traitement (details_version) pour garantir l'idempotence.
===============================================================================
"""

import os
import sys
import asyncio
import logging
import orjson
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BACKEND_DIR)

from app.db.session import AsyncSessionLocal
from app.db.models import Match
from app.services.trimmer import DataTrimmer
from app.services.storage_service import StorageService

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("BackfillDetails")

# Version cible. Si tu modifies la logique du trimmer, incrémente cette variable.
TARGET_VERSION = 1
BATCH_SIZE = 100

async def process_batch(session: AsyncSession, storage: StorageService, batch_ids: list[str]) -> int:
    """
    Traite un lot défini d'identifiants de matchs de manière concurrente.
    
    1. Crée une liste de tâches asynchrones pour télécharger tous les JSON depuis MinIO simultanément.
    2. Attend la résolution globale via asyncio.gather.
    3. Passe chaque payload dans le DataTrimmer.
    4. Prépare un dictionnaire pour le Bulk Update SQLAlchemy.
    5. Pousse les modifications en base en une seule transaction.
    
    Retourne le nombre de matchs mis à jour avec succès.
    """
    # Lancement concurrent des téléchargements I/O réseau
    download_tasks = [storage.download_json(m_id, "details") for m_id in batch_ids]
    raw_payloads = await asyncio.gather(*download_tasks, return_exceptions=True)
    
    update_mappings = []
    
    for match_id, raw_data in zip(batch_ids, raw_payloads):
        if isinstance(raw_data, Exception) or not raw_data:
            logger.warning(f"Payload introuvable ou erreur MinIO pour {match_id}")
            continue
            
        try:
            trimmed_match = DataTrimmer.trim_match_details(raw_data)
            if trimmed_match:
                update_mappings.append({
                    "match_id": match_id,
                    "raw_match_data": trimmed_match,
                    "details_version": TARGET_VERSION
                })
        except Exception as e:
            logger.error(f"Erreur de trimming sur {match_id}: {e}")
            
    if not update_mappings:
        return 0

    # Bulk Update natif SQLAlchemy 2.0
    await session.execute(update(Match), update_mappings)
    return len(update_mappings)

async def run_details_backfill():
    """
    Orchestrateur principal du backfill des détails.
    
    Implémente la logique de Keyset Pagination : au lieu d'un OFFSET lourd
    ou de tout charger en RAM, on cherche le prochain lot de 100 matchs 
    dont l'ID est strictement supérieur au dernier traité ET dont la version
    est obsolète.
    """
    logger.info(f"Démarrage du Backfill Details vers la version v{TARGET_VERSION}...")
    storage = StorageService()
    total_updated = 0
    last_id = ""

    async with AsyncSessionLocal() as session:
        while True:
            # Keyset Pagination : Ultra rapide grâce à l'indexation de la Primary Key
            query = (
                select(Match.match_id)
                .where(Match.details_version < TARGET_VERSION)
                .where(Match.match_id > last_id)
                .order_by(Match.match_id.asc())
                .limit(BATCH_SIZE)
            )
            
            result = await session.execute(query)
            batch_ids = [row[0] for row in result.fetchall()]
            
            if not batch_ids:
                break # Fin du traitement, plus aucun match obsolète trouvé
                
            updated_count = await process_batch(session, storage, batch_ids)
            total_updated += updated_count
            
            # Mise à jour du curseur
            last_id = batch_ids[-1]
            
            await session.commit()
            logger.info(f"Progression : {total_updated} matchs détails mis à jour...")

    logger.info("Opération Backfill Details terminée avec succès.")

if __name__ == "__main__":
    asyncio.run(run_details_backfill())