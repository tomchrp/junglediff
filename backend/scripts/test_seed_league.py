"""
===============================================================================
FICHIER : backend/scripts/test_seed_league.py
PROJET  : JungleDiff

DESCRIPTION :
Script de test unitaire permettant de simuler et valider la chaîne complète
d'amorçage du Crawler par Elo (Snowballing classé).

MODIFICATIONS :
- Adaptation au nouveau format de l'API Riot : extraction directe du PUUID.
- Contournement dynamique de l'étape de traduction (Summoner-V4) si le PUUID
  est déjà fourni par l'API League-V4, économisant 1 requête API.
===============================================================================
"""

import os
import sys
import asyncio
import logging

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BACKEND_DIR)

from app.services.riot_client import RiotClient
from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("TestSeedLeague")

async def test_league_pipeline():
    if not settings.RIOT_API_KEY:
        logger.error("La clé API Riot (RIOT_API_KEY) est introuvable.")
        return

    client = RiotClient(settings.RIOT_API_KEY)
    
    region = "euw1"
    continent = "europe"
    queue = "RANKED_SOLO_5x5"
    tier = "DIAMOND"
    division = "I"

    logger.info(f"--- ÉTAPE 1 : Test de League-V4 sur {tier} {division} ---")
    entries = await client.get_league_entries_by_division(region, queue, tier, division, page=1)
    
    if not entries:
        logger.error("Échec : L'API League-V4 n'a retourné aucun joueur.")
        return
        
    logger.info(f"Succès : {len(entries)} joueurs trouvés. Extraction du premier joueur...")
    first_player = entries[0]
    
    puuid = first_player.get("puuid")
    summoner_id = first_player.get("summonerId")
    
    if puuid:
        logger.info(f"BINGO ! L'API League-V4 fournit directement le PUUID : {puuid}")
        logger.info("--- ÉTAPE 2 : IGNORÉE (Traduction Summoner-V4 devenue inutile) ---")
    elif summoner_id:
        logger.info(f"Ancien format détecté (SummonerId) : {summoner_id}")
        logger.info("--- ÉTAPE 2 : Test de Summoner-V4 (Traduction) ---")
        summoner_data = await client.get_summoner_by_id(region, summoner_id)
        
        if not summoner_data or "puuid" not in summoner_data:
            logger.error(f"Échec : Impossible de traduire le SummonerId {summoner_id}.")
            return
        puuid = summoner_data["puuid"]
        logger.info(f"Succès : PUUID récupéré via traduction : {puuid}")
    else:
        logger.error(f"Échec : Ni PUUID ni SummonerId dans le payload. Payload : {first_player}")
        return

    logger.info("--- ÉTAPE 3 : Test de Match-V5 (Historique) ---")
    match_ids = await client.get_match_ids(continent, puuid, queue=420, count=5)
    
    if match_ids is None:
        logger.error("Échec de l'étape 3 : L'API Match-V5 a échoué.")
        return
    elif len(match_ids) == 0:
        logger.warning("L'API a répondu mais ce joueur n'a aucun match récent en SoloQ (420).")
    else:
        logger.info(f"Succès total : {len(match_ids)} matchs trouvés pour ce PUUID. Exemple : {match_ids[0]}")

if __name__ == "__main__":
    asyncio.run(test_league_pipeline())