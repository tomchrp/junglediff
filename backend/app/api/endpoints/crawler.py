"""
===============================================================================
FICHIER : backend/app/api/endpoints/crawler.py
PROJET  : JungleDiff

DESCRIPTION :
Routeur FastAPI dédié à l'administration du Crawler Big Data.

MODIFICATIONS (RÉCONCILIATION & CORRECTION MÉTRIQUES) :
- Ajout de la route /sync-metrics : recalcule la vérité absolue depuis
  PostgreSQL en cas de corruption ou de dérive du cache JSON.
- Extraction des Queues via opérateur JSONB natif PostgreSQL.
===============================================================================
"""

import json
import time
import asyncio
import logging
from fastapi import APIRouter, Depends, Request, HTTPException
from sse_starlette.sse import EventSourceResponse
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.session import get_db
from app.db.models import CrawlerState, CrawlerSummonerQueue, CrawlerQueue, Player
from app.services.crawler_service import CrawlerService
from app.services.riot_client import RiotClient
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

class ToggleRequest(BaseModel):
    is_active: bool

class SetModeRequest(BaseModel):
    mode: str

class SeedRequest(BaseModel):
    puuid: str

class SeedLeagueRequest(BaseModel):
    tier: str
    division: str
    queue: str = "RANKED_SOLO_5x5"

@router.post("/toggle")
async def toggle_crawler(req: ToggleRequest, db: AsyncSession = Depends(get_db)):
    service = CrawlerService(db)
    state = await service.toggle_crawler(req.is_active)
    status_str = "démarré" if state.is_active else "mis en pause"
    return {"message": f"Crawler {status_str} avec succès.", "is_active": state.is_active}

@router.post("/set-mode")
async def set_crawler_mode(req: SetModeRequest, db: AsyncSession = Depends(get_db)):
    try:
        service = CrawlerService(db)
        state = await service.set_crawler_mode(req.mode)
        return {"message": f"Mode défini sur {req.mode}", "crawler_mode": state.crawler_mode}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/purge")
async def purge_queues(db: AsyncSession = Depends(get_db)):
    service = CrawlerService(db)
    await service.purge_queues()
    return {"message": "Toutes les files d'attente ont été purgées et les compteurs réinitialisés."}

@router.post("/sync-metrics")
async def sync_crawler_metrics(db: AsyncSession = Depends(get_db)):
    """
    Bouton d'urgence / Réconciliation : 
    Force PostgreSQL à scanner ses tables pour écraser le cache corrompu 
    avec la vérité absolue du terrain.
    """
    try:
        # 1. Total Détails
        details_count = await db.scalar(text("SELECT COUNT(*) FROM matches WHERE is_crawled = true"))
        
        # 2. Total Timelines
        timelines_count = await db.scalar(text("SELECT COUNT(*) FROM matches WHERE timeline_status = 'FETCHED'"))
        
        # 3. Répartition des Détails par Queue (Magie JSONB PostgreSQL)
        queue_q = await db.execute(text("SELECT raw_match_data->'info'->>'queueId' as q, COUNT(*) FROM matches WHERE is_crawled = true GROUP BY q"))
        details_by_queue = {str(row[0]): row[1] for row in queue_q.fetchall() if row[0]}
        
        # 4. Démographie des Joueurs
        tier_q = await db.execute(text("SELECT tier, COUNT(*) FROM players WHERE tier IS NOT NULL GROUP BY tier"))
        players_by_tier = {str(row[0]): row[1] for row in tier_q.fetchall() if row[0]}

        # Reconstruction propre de l'état
        service = CrawlerService(db)
        state = await service.get_or_create_state()
        state.aggregated_metrics = {
            "details_crawled": details_count,
            "timelines_crawled": timelines_count,
            "details_by_queue": details_by_queue,
            "players_by_tier": players_by_tier
        }
        
        await db.commit()
        return {"message": f"Cache reconstruit : {details_count} détails trouvés en DB."}
    except Exception as e:
        logger.error(f"Erreur Sync Metrics: {e}")
        raise HTTPException(status_code=500, detail="Échec de la reconstruction SQL.")

@router.post("/seed")
async def seed_crawler(req: SeedRequest, db: AsyncSession = Depends(get_db)):
    service = CrawlerService(db)
    await service.seed_crawler(req.puuid)
    return {"message": "Graine (PUUID) injectée avec succès dans la file d'attente."}

@router.post("/seed-league")
async def seed_league_crawler(req: SeedLeagueRequest, db: AsyncSession = Depends(get_db)):
    client = RiotClient(settings.RIOT_API_KEY)
    routing = client.get_routing("EUW")
    
    entries = await client.get_league_entries_by_division(
        region=routing["region"], 
        queue=req.queue, 
        tier=req.tier, 
        division=req.division
    )
    
    if not entries:
        raise HTTPException(status_code=404, detail="Aucun joueur trouvé ou erreur API Riot.")
        
    current_time = int(time.time() * 1000)
    summoners_to_translate = []
    players_to_insert = []
    crawlers_to_insert = []
    
    for entry in entries:
        puuid = entry.get("puuid")
        summoner_id = entry.get("summonerId") or entry.get("summoner_id")
        
        if puuid:
            players_to_insert.append({
                "puuid": puuid, "summoner_id": summoner_id, "riot_id_name": "Unknown", 
                "riot_id_tagline": "UNK", "tier": req.tier, "rank": req.division
            })
            crawlers_to_insert.append({
                "puuid": puuid, "status": "PENDING", "discovery_depth": 1, "discovered_at": current_time
            })
        elif summoner_id:
            summoners_to_translate.append({
                "summoner_id": summoner_id, "tier": req.tier, "rank": req.division, 
                "status": "PENDING", "discovered_at": current_time
            })
            
    if players_to_insert:
        await db.execute(insert(Player).values(players_to_insert).on_conflict_do_nothing(index_elements=['puuid']))
    if crawlers_to_insert:
        await db.execute(insert(CrawlerQueue).values(crawlers_to_insert).on_conflict_do_nothing(index_elements=['puuid']))
    if summoners_to_translate:
        await db.execute(insert(CrawlerSummonerQueue).values(summoners_to_translate).on_conflict_do_nothing(index_elements=['summoner_id']))
        
    await db.commit()
    return {"message": f"Succès : {len(players_to_insert)} joueurs ajoutés directement (PUUID), {len(summoners_to_translate)} mis en attente de traduction."}

@router.get("/stream-metrics")
async def stream_crawler_metrics(request: Request, db: AsyncSession = Depends(get_db)):
    async def event_generator():
        while True:
            if await request.is_disconnected():
                break
            query = select(CrawlerState).where(CrawlerState.id == 1)
            result = await db.execute(query)
            state = result.scalar_one_or_none()
            await db.commit() 
            
            if state:
                metrics_payload = {
                    "is_active": state.is_active,
                    "crawler_mode": state.crawler_mode,
                    "total_requests": state.total_requests_made,
                    "aggregated_metrics": state.aggregated_metrics
                }
                yield {"event": "message", "data": json.dumps(metrics_payload)}
            await asyncio.sleep(1)
    return EventSourceResponse(event_generator())