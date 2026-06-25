"""
Script de diagnostic brut pour isoler le comportement de l'API Riot Games.
Contourne FastAPI et PostgreSQL.
"""
import asyncio
import json
import sys
from app.core.config import settings
from app.services.riot_client import RiotClient

async def main():
    print(f"Cle API chargee : {settings.RIOT_API_KEY[:5]}... (longueur: {len(settings.RIOT_API_KEY)})")
    client = RiotClient(settings.RIOT_API_KEY)
    
    game_name = input("Entrez le Riot ID (ex: KC NEXT AD KING) : ").strip()
    tag_line = input("Entrez le Tagline (ex: EUW) : ").strip()
    
    print("\n[1/2] Appel Account V1 (Routage : europe)...")
    account = await client.get_account_by_riot_id("europe", game_name, tag_line)
    print(json.dumps(account, indent=2))
    
    if not account or "puuid" not in account:
        print("\nARRET : Impossible de trouver le PUUID.")
        return
        
    puuid = account["puuid"]
    
    print(f"\n[2/2] Appel Summoner V4 (Routage : euw1) avec le PUUID : {puuid}...")
    summoner = await client.get_summoner_by_puuid("euw1", puuid)
    print(json.dumps(summoner, indent=2))

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())