"""
===============================================================================
FICHIER : backend/scripts/backfill_from_cold.py
PROJET  : JungleDiff

DESCRIPTION :
Script de réhydratation (Backfill) autonome connecté au Data Lake (MinIO).
Ce script a été repensé pour être piloté par la base de données (PostgreSQL) 
plutôt que par le système de fichiers ou le bucket S3. Il télécharge les JSON 
bruts depuis MinIO uniquement pour les matchs existants en base, applique le 
DataTrimmer, et calcule les métriques analytiques à 15 minutes pour enrichir 
la table MatchParticipant (Hot Storage).

MODIFICATIONS (JUNGLE PATHING) :
- Le dictionnaire de la requête d'UPDATE intègre désormais les 6 colonnes
  spatiales issues de `extract_timeline_metrics`.
===============================================================================
"""

import os
import sys
import asyncio
import logging
from dotenv import load_dotenv
from sqlalchemy import select, update

# Configuration des chemins et environnement
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BACKEND_DIR, ".env"))
sys.path.append(BACKEND_DIR)

from app.db.session import AsyncSessionLocal
from app.db.models import Match, MatchTimeline, MatchParticipant
from app.services.trimmer import DataTrimmer
from app.services.storage_service import StorageService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Backfill")

async def run_backfill():
    """
    Orchestre la réhydratation des données existantes.
    
    Fonctionnement :
    1. Interroge la table Match pour obtenir la liste exhaustive des parties.
    2. Pour chaque identifiant, tente de télécharger les détails et la timeline depuis MinIO.
    3. Applique le trimming sur les données récupérées.
    4. Si les deux JSON sont présents, déclenche l'extraction des métriques de snowball 
       ainsi que des coordonnées spatiales, puis met à jour la table MatchParticipant.
    5. Effectue des commits par lots (batch) pour préserver la mémoire vive.
    """
    logger.info("Démarrage du Backfill via MinIO (Piloté par PostgreSQL)...")
    storage = StorageService()

    async with AsyncSessionLocal() as session:
        # Récupération de tous les ID de matchs existants en base
        result = await session.execute(select(Match.match_id))
        match_ids = [row[0] for row in result.fetchall()]
        total_matches = len(match_ids)
        
        logger.info(f"{total_matches} matchs identifiés en base. Début du traitement.")

        matches_updated = 0
        timelines_updated = 0
        metrics_updated = 0
        errors = 0

        for idx, match_id in enumerate(match_ids, 1):
            try:
                # Téléchargement asynchrone depuis MinIO
                raw_details = await storage.download_json(match_id, "details")
                raw_timeline = await storage.download_json(match_id, "timeline")

                trimmed_match = None
                trimmed_timeline = None

                # Traitement des détails
                if raw_details:
                    trimmed_match = DataTrimmer.trim_match_details(raw_details)
                    if trimmed_match:
                        await session.execute(
                            update(Match)
                            .where(Match.match_id == match_id)
                            .values(raw_match_data=trimmed_match)
                        )
                        matches_updated += 1

                # Traitement de la timeline
                if raw_timeline:
                    trimmed_timeline = DataTrimmer.trim_match_timeline(raw_timeline)
                    if trimmed_timeline:
                        await session.execute(
                            update(MatchTimeline)
                            .where(MatchTimeline.match_id == match_id)
                            .values(raw_timeline_data=trimmed_timeline)
                        )
                        timelines_updated += 1

                # Extraction et mise à jour des métriques Big Data et Pathing
                if trimmed_match and trimmed_timeline:
                    metrics_dict = DataTrimmer.extract_timeline_metrics(trimmed_match, trimmed_timeline)
                    if metrics_dict:
                        for puuid, m in metrics_dict.items():
                            await session.execute(
                                update(MatchParticipant)
                                .where(MatchParticipant.match_id == match_id)
                                .where(MatchParticipant.puuid == puuid)
                                .values(
                                    gold_diff_15m=m.get("gold_diff_15m"),
                                    xp_diff_15m=m.get("xp_diff_15m"),
                                    is_snowballing=m.get("is_snowballing"),
                                    # Injection des coordonnées
                                    pos_f1_x=m.get("pos_f1_x"),
                                    pos_f1_y=m.get("pos_f1_y"),
                                    pos_f2_x=m.get("pos_f2_x"),
                                    pos_f2_y=m.get("pos_f2_y"),
                                    pos_f3_x=m.get("pos_f3_x"),
                                    pos_f3_y=m.get("pos_f3_y")
                                )
                            )
                        metrics_updated += 1

                # Commit par lots pour éviter de saturer la mémoire transactionnelle
                if idx % 50 == 0:
                    await session.commit()
                    logger.info(f"Progression : {idx}/{total_matches} matchs traités...")

            except Exception as e:
                logger.error(f"Erreur sur le match {match_id}: {str(e)}")
                await session.rollback()
                errors += 1

        # Commit final
        await session.commit()

    logger.info("--- Bilan du Backfill ---")
    logger.info(f"Match Details mis à jour : {matches_updated}")
    logger.info(f"Timelines mises à jour   : {timelines_updated}")
    logger.info(f"Matchs enrichis (Métriques et Pathing) : {metrics_updated}")
    logger.info(f"Erreurs rencontrées      : {errors}")
    logger.info("Opération terminée avec succès.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_backfill())