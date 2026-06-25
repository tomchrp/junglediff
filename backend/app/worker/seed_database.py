"""
===============================================================================
Fichier : backend/app/worker/seed_database.py
Projet  : JungleDiff

Description :
Script d'amorçage pour la base de données. Il interroge l'API Riot pour 
récupérer les N derniers identifiants de parties d'un joueur, sans filtrage 
de mode de jeu pour garantir l'ordre chronologique réel. 
Il transmet ensuite ces identifiants à la file d'attente Redis pour un 
traitement asynchrone par les workers.
===============================================================================
"""

import sys
import os
import asyncio
from arq import create_pool
from arq.connections import RedisSettings

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.config import settings
from app.services.riot_client import RiotClient

async def main():
    print("Demarrage du moissonnage de parties...")
    
    if not settings.RIOT_API_KEY:
        print("Erreur : Cle RIOT_API_KEY manquante.")
        return

    riot_id = input("Entrez le Riot ID (ex: Faker#T1) : ").strip()
    if "#" not in riot_id:
        print("Erreur : Le format doit contenir un hashtag.")
        return

    game_name, tag_line = riot_id.split("#", 1)
    
    try:
        target_count = int(input("Combien des dernieres parties voulez-vous analyser ? : ").strip())
    except ValueError:
        print("Erreur : Entrez un nombre entier.")
        return

    client = RiotClient(settings.RIOT_API_KEY)
    continent = "europe"
    
    print(f"Recherche du PUUID pour {game_name}#{tag_line}...")
    account_data = await client.get_account_by_riot_id(continent, game_name, tag_line)
    
    if not account_data:
        print("Joueur introuvable ou erreur de cle API.")
        return
        
    puuid = account_data['puuid']
    print(f"Recuperation des {target_count} derniers identifiants de parties...")
    
    match_ids = await client.get_match_ids_by_puuid(continent, puuid, count=target_count)
    
    if not match_ids:
        print("Aucune partie trouvee.")
        return

    print(f"{len(match_ids)} parties trouvees. Injection dans la file d'attente Redis...")
    
    redis_pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
    
    tasks_injected = 0
    for match_id in match_ids:
        await redis_pool.enqueue_job('process_match_ingestion', match_id, continent)
        tasks_injected += 1
        
    await redis_pool.aclose()
    print(f"Termine. {tasks_injected} taches envoyees aux workers.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())