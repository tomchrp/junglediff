"""
===============================================================================
FICHIER : backend/scripts/run_crawler.py
PROJET  : JungleDiff

DESCRIPTION :
Point d'entrée autonome (Worker) pour le Crawler Big Data.
Ce script s'exécute en boucle infinie. Il agit comme un consommateur
sur les files d'attente PostgreSQL (CrawlerQueue et CrawlerMatchQueue).
Il lit le statut global (is_active) pour se mettre en pause instantanément
si l'utilisateur l'exige via l'API.
Il implémente une interception des signaux système (SIGINT/SIGTERM) pour
garantir un arrêt gracieux sans corrompre les transactions en cours.
===============================================================================
"""

import asyncio
import logging
import signal
import sys
import os

# Ajout du chemin racine au PYTHONPATH pour permettre les imports absolus
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
        """
        Intercepte les signaux d'arrêt du système d'exploitation (ex: Ctrl+C, docker stop).
        Au lieu de tuer le processus brutalement, déclenche l'événement de fermeture
        pour permettre à la boucle principale de terminer proprement la transaction
        SQL en cours (commit ou rollback) et de libérer les verrous (SKIP LOCKED).
        """
        logger.info("\nSignal d'arrêt reçu. Fermeture gracieuse en cours (fin de la transaction actuelle)...")
        self.shutdown_event.set()

    async def run(self):
        """
        Boucle d'exécution principale du worker asynchrone.
        
        Logique de priorité :
        1. Vérifie si l'arrêt a été demandé par le système.
        2. Récupère une session de base de données fraîche via AsyncSessionLocal.
        3. Initialise le service et vérifie si l'application autorise le crawling (is_active).
        4. Si en pause, le worker dort pendant 5 secondes pour économiser le CPU.
        5. Si actif, il priorise le traitement des Matchs (process_next_match) pour vider la file.
        6. Si aucun Match n'est en attente, il tente de traiter un Joueur (process_next_player).
        7. Si les deux files sont vides, il dort en attendant l'injection d'une nouvelle graine.
        """
        # Attachement des signaux systèmes pour l'arrêt gracieux
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

        logger.info("Démarrage du Worker Crawler Big Data...")

        while not self.shutdown_event.is_set():
            # Utilisation de la session asynchrone correcte
            async with AsyncSessionLocal() as db:
                service = CrawlerService(db)
                
                try:
                    state = await service.get_or_create_state()
                    
                    if not state.is_active:
                        # Le crawler est en pause via l'API/Frontend
                        await asyncio.sleep(5)
                        continue

                    # Priorité 1 : Traiter les matchs en attente (réduit la taille de la file)
                    processed_match = await service.process_next_match()
                    if processed_match:
                        logger.info(f"Match ingéré avec succès : {processed_match}")
                        # On reboucle immédiatement sans pause pour maximiser le débit
                        continue 

                    # Priorité 2 : Si plus de matchs, on récupère l'historique du prochain joueur
                    processed_player = await service.process_next_player()
                    if processed_player:
                        logger.info(f"Historique récupéré pour le joueur : {processed_player}")
                        continue

                    # Si on arrive ici, c'est que les deux files (Matches et Players) sont vides
                    # Si on arrive ici, c'est que les deux files sont vides
                    logger.info("Crawler en veille : 0 match, 0 joueur en file d'attente.")
                    await asyncio.sleep(5)

                except Exception as e:
                    logger.error(f"Erreur inattendue dans la boucle principale du worker : {e}")
                    # En cas d'erreur lourde (ex: perte de connexion DB), on attend avant de réessayer
                    await asyncio.sleep(5)

        logger.info("Worker arrêté proprement.")

if __name__ == "__main__":
    worker = CrawlerWorker()
    asyncio.run(worker.run())