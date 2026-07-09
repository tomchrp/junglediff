"""
===============================================================================
FICHIER : backend/scripts/run_crawler.py
PROJET  : JungleDiff

DESCRIPTION :
Point d'entrée autonome (Worker) pour le Crawler Big Data.
Ce script s'exécute en boucle infinie. Il agit comme un consommateur
sur les files d'attente PostgreSQL.

MODIFICATIONS (PHASE 2 - BATCH & UPSERT) :
- Ajout de la priorité sur la nouvelle file CrawlerSummonerQueue (Rate Limit pondéré).
- Le worker vérifie s'il doit traduire un Summoner, avec une fréquence
  volontairement abaissée pour privilégier la donnée de jeu pure.
===============================================================================
"""

import asyncio
import logging
import signal
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.services.crawler_service import CrawlerService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("CrawlerWorker")

class CrawlerWorker:
    def __init__(self):
        self.shutdown_event = asyncio.Event()

    def _signal_handler(self, sig, frame):
        """Fermeture gracieuse : autorise le commit transactionnel en cours."""
        logger.info("\nSignal d'arrêt reçu. Fermeture gracieuse en cours (fin de la transaction actuelle)...")
        self.shutdown_event.set()

    async def run(self):
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

        logger.info("Démarrage du Worker Crawler Big Data...")
        
        loop_counter = 0

        while not self.shutdown_event.is_set():
            async with AsyncSessionLocal() as db:
                service = CrawlerService(db)
                
                try:
                    state = await service.get_or_create_state()
                    
                    if not state.is_active:
                        await asyncio.sleep(5)
                        continue

                    # PRIORITÉ 1 : Dépiler les Matchs (La cible finale)
                    processed_match = await service.process_next_match()
                    if processed_match:
                        logger.info(f"Match ingéré avec succès : {processed_match}")
                        loop_counter += 1
                        continue 

                    # PRIORITÉ 2 : Dépiler les Joueurs connus (Recherche d'historique)
                    processed_player = await service.process_next_player()
                    if processed_player:
                        logger.info(f"Historique récupéré pour le joueur : {processed_player}")
                        loop_counter += 1
                        continue

                    # PRIORITÉ 3 PONDÉRÉE : Traduction des Summoners (Snowball de division)
                    # On ne le fait que si les autres files sont vides, ou 1 fois sur 10.
                    if loop_counter % 10 == 0:
                        processed_summoner = await service.process_next_summoner()
                        if processed_summoner:
                            logger.info(f"Summoner traduit en PUUID : {processed_summoner}")
                            loop_counter += 1
                            continue

                    logger.info("Crawler en veille : Files d'attente vides.")
                    await asyncio.sleep(5)
                    loop_counter += 1 # Incrémente même en veille pour débloquer le modulo

                except Exception as e:
                    logger.error(f"Erreur inattendue dans la boucle principale du worker : {e}")
                    await asyncio.sleep(5)

        logger.info("Worker arrêté proprement.")

if __name__ == "__main__":
    worker = CrawlerWorker()
    asyncio.run(worker.run())