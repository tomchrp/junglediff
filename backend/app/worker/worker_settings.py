"""
===============================================================================
Fichier : backend/app/worker/worker_settings.py
Projet  : JungleDiff
===============================================================================
"""

import logging
from arq.connections import RedisSettings
from app.core.config import settings
from app.services.riot_client import RiotClient
from app.worker.tasks import process_match_ingestion, process_timeline_only

logger = logging.getLogger("JungleDiffWorker")

async def on_startup(ctx):
    logger.info("Démarrage du Worker ARQ JungleDiff...")
    ctx["riot_client"] = RiotClient(settings.RIOT_API_KEY)

async def on_shutdown(ctx):
    logger.info("Arrêt du Worker ARQ...")

class WorkerSettings:
    functions = [process_match_ingestion, process_timeline_only]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    on_startup = on_startup
    on_shutdown = on_shutdown
    
    # Parallélisation : Le quota étant désormais protégé par le Triple Appel, 
    # traiter 15 parties simultanément est extrêmement sûr.
    max_jobs = 15