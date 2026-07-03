import asyncio
import os
import sys
# On ajoute le chemin pour que Python trouve 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import AsyncSessionLocal
from app.db.models import CrawlerState
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(CrawlerState).where(CrawlerState.id == 1))
        state = result.scalar_one_or_none()
        if state:
            print(f"--- État du Crawler en Base ---")
            print(f"Extraction Only: {state.extraction_only}")
            print(f"Is Active: {state.is_active}")
        else:
            print("Erreur: crawler_state introuvable.")

if __name__ == "__main__":
    asyncio.run(check())