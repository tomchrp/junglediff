"""
===============================================================================
FICHIER : backend/app/worker/worker_settings.py
PROJET  : JungleDiff

DESCRIPTION :
Configuration des workers ARQ.
Contient désormais DEUX classes distinctes pour écouter les deux files d'attente
indépendantes (default et high_priority), garantissant une véritable priorisation.
===============================================================================
"""

import logging
from arq.connections import RedisSettings
from app.core.config import settings
from app.services.riot_client import RiotClient
from app.worker.tasks import process_match_ingestion, process_timeline_only

logger = logging.getLogger("JungleDiffWorker")

async def on_startup(ctx):
    logger.info("Démarrage du Worker ARQ...")
    ctx["riot_client"] = RiotClient(settings.RIOT_API_KEY)

async def on_shutdown(ctx):
    logger.info("Arrêt du Worker ARQ...")

# --- WORKER BACKGROUND (Ingestion massive des historiques) ---
class WorkerSettingsDefault:
    functions = [process_match_ingestion, process_timeline_only]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    on_startup = on_startup
    on_shutdown = on_shutdown
    max_jobs = 10
    queue_name = 'default'

# --- WORKER FRONTEND (Anticipation spatiale et requêtes à la volée) ---
class WorkerSettingsHigh:
    functions = [process_match_ingestion, process_timeline_only]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    on_startup = on_startup
    on_shutdown = on_shutdown
    max_jobs = 5
    queue_name = 'high_priority'