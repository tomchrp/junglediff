"""
===============================================================================
FICHIER : backend/scripts/backfill_timelines.py
PROJET  : JungleDiff

DESCRIPTION :
Script de réhydratation asynchrone par lots (Batch) dédié exclusivement
aux Timelines et à l'extraction de l'ingénierie analytique (Pathing, Économie).
Télécharge les Timelines et les Détails depuis MinIO car les deux sont requis
pour le calcul croisé des métriques.
Met à jour le Hot Storage (MatchParticipant) et la timeline_version.
===============================================================================
"""

import os
import sys
import asyncio
import logging
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BACKEND_DIR)

from app.db.session import AsyncSessionLocal
from app.db.models import Match, MatchTimeline, MatchParticipant
from app.services.trimmer import DataTrimmer
from app.services.storage_service import StorageService

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("BackfillTimelines")

TARGET_VERSION = 1
BATCH_SIZE = 50 # Légèrement réduit car on télécharge 2 fichiers par match

async def process_timeline_batch(session: AsyncSession, storage: StorageService, batch_ids: list[str]) -> int:
    """
    Traite un lot pour le backfill des Timelines et des métriques Big Data.
    
    1. Télécharge conjointement les Détails et les Timelines depuis MinIO.
    2. Exécute l'élagage (Trimming) sur les Timelines.
    3. Croise les données pour extraire les deltas d'économie et les coordonnées (extract_timeline_metrics).
    4. Prépare et exécute les requêtes de Bulk Update pour MatchTimeline, MatchParticipant, et Match.
    """
    # Lancement des téléchargements croisés
    tasks_details = [storage.download_json(m_id, "details") for m_id in batch_ids]
    tasks_timelines = [storage.download_json(m_id, "timeline") for m_id in batch_ids]
    
    raw_details_list = await asyncio.gather(*tasks_details, return_exceptions=True)
    raw_timelines_list = await asyncio.gather(*tasks_timelines, return_exceptions=True)
    
    timelines_mappings = []
    match_version_mappings = []
    
    for i, match_id in enumerate(batch_ids):
        raw_details = raw_details_list[i]
        raw_timeline = raw_timelines_list[i]
        
        if isinstance(raw_details, Exception) or isinstance(raw_timeline, Exception) or not raw_details or not raw_timeline:
            continue
            
        try:
            trimmed_details = DataTrimmer.trim_match_details(raw_details)
            trimmed_timeline = DataTrimmer.trim_match_timeline(raw_timeline)
            
            if not trimmed_details or not trimmed_timeline:
                continue
                
            metrics_dict = DataTrimmer.extract_timeline_metrics(trimmed_details, trimmed_timeline)
            
            if metrics_dict:
                # Mise à jour individuelle des participants
                for puuid, m in metrics_dict.items():
                    await session.execute(
                        update(MatchParticipant)
                        .where(MatchParticipant.match_id == match_id)
                        .where(MatchParticipant.puuid == puuid)
                        .values(
                            gold_diff_15m=m.get("gold_diff_15m"),
                            xp_diff_15m=m.get("xp_diff_15m"),
                            is_snowballing=m.get("is_snowballing"),
                            pos_f1_x=m.get("pos_f1_x"), pos_f1_y=m.get("pos_f1_y"),
                            pos_f2_x=m.get("pos_f2_x"), pos_f2_y=m.get("pos_f2_y"),
                            pos_f3_x=m.get("pos_f3_x"), pos_f3_y=m.get("pos_f3_y")
                        )
                    )
                
                timelines_mappings.append({
                    "match_id": match_id,
                    "raw_timeline_data": trimmed_timeline
                })
                match_version_mappings.append({
                    "match_id": match_id,
                    "timeline_version": TARGET_VERSION
                })
                
        except Exception as e:
            logger.error(f"Erreur d'extraction analytique sur {match_id}: {e}")

    # Application des Bulk Updates restants
    if timelines_mappings:
        await session.execute(update(MatchTimeline), timelines_mappings)
    if match_version_mappings:
        await session.execute(update(Match), match_version_mappings)
        
    return len(match_version_mappings)

async def run_timelines_backfill():
    """
    Orchestrateur principal du backfill des Timelines via Keyset Pagination.
    Cible uniquement les matchs dont la timeline a été ingérée mais dont la version est obsolète.
    """
    logger.info(f"Démarrage du Backfill Timelines vers la version v{TARGET_VERSION}...")
    storage = StorageService()
    total_updated = 0
    last_id = ""

    async with AsyncSessionLocal() as session:
        while True:
            query = (
                select(Match.match_id)
                .where(Match.timeline_status == 'FETCHED')
                .where(Match.timeline_version < TARGET_VERSION)
                .where(Match.match_id > last_id)
                .order_by(Match.match_id.asc())
                .limit(BATCH_SIZE)
            )
            
            result = await session.execute(query)
            batch_ids = [row[0] for row in result.fetchall()]
            
            if not batch_ids:
                break
                
            updated_count = await process_timeline_batch(session, storage, batch_ids)
            total_updated += updated_count
            last_id = batch_ids[-1]
            
            await session.commit()
            logger.info(f"Progression : {total_updated} timelines analytiques mises à jour...")

    logger.info("Opération Backfill Timelines terminée avec succès.")

if __name__ == "__main__":
    asyncio.run(run_timelines_backfill())