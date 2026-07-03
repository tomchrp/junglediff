"""
===============================================================================
FICHIER : backend/app/api/endpoints/crawler.py
PROJET  : JungleDiff

DESCRIPTION :
Routeur FastAPI exposant l'API de contrôle du Crawler Big Data.
Permet d'amorcer le crawler (Seed), de le démarrer/mettre en pause (Toggle),
et de diffuser en temps réel les métriques d'ingestion au frontend via 
un flux Server-Sent Events (SSE).
===============================================================================
"""

import json
import asyncio
import logging
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.db.models import CrawlerState, CrawlerQueue, CrawlerMatchQueue, Match
from app.services.crawler_service import CrawlerService

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/toggle", response_model=Dict[str, Any])
async def toggle_crawler_state(
    is_active: bool = Body(..., embed=True),
    db: AsyncSession = Depends(get_db)
):
    """
    Fonction de contrôle principal (Start/Pause).
    Instancie le CrawlerService et met à jour le flag global `is_active` dans 
    la base de données. Les workers ARQ en arrière-plan vérifient ce flag 
    avant chaque itération et s'arrêtent proprement s'il passe à False.
    """
    service = CrawlerService(db)
    try:
        state = await service.toggle_crawler(is_active)
        return {
            "status": "success", 
            "is_active": state.is_active,
            "message": "Crawler démarré" if state.is_active else "Crawler en pause"
        }
    except Exception as e:
        logger.error(f"Erreur lors du toggle du crawler: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


@router.post("/seed", response_model=Dict[str, Any])
async def seed_crawler_queue(
    puuid: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db)
):
    """
    Point d'amorçage du graphe (Snowballing).
    Injecte un PUUID initial dans la file d'attente d'exploration.
    C'est à partir de ce joueur que le système découvrira les autres.
    """
    if not puuid:
        raise HTTPException(status_code=400, detail="PUUID manquant")
        
    service = CrawlerService(db)
    try:
        await service.seed_crawler(puuid)
        return {"status": "success", "message": f"Graine injectée avec succès: {puuid}"}
    except Exception as e:
        logger.error(f"Erreur lors de l'injection de la graine: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


@router.get("/stream-metrics")
async def stream_crawler_metrics(db: AsyncSession = Depends(get_db)):
    async def event_generator():
        try:
            while True:
                # 1. LA CLÉ EST ICI : Forcer la fin de la transaction précédente pour vider le cache SQL
                await db.commit()

                # 2. Lecture de l'état global (Données fraîches)
                query_state = select(CrawlerState).where(CrawlerState.id == 1)
                result_state = await db.execute(query_state)
                state = result_state.scalar_one_or_none()
                
                is_active = state.is_active if state else False
                extraction_only = state.extraction_only if state else False
                total_requests = state.total_requests_made if state else 0
                
                query_players_pending = select(func.count(CrawlerQueue.puuid)).where(CrawlerQueue.status == 'PENDING')
                players_pending = (await db.execute(query_players_pending)).scalar() or 0
                
                query_matches_pending = select(func.count(CrawlerMatchQueue.match_id)).where(CrawlerMatchQueue.status == 'PENDING')
                matches_pending = (await db.execute(query_matches_pending)).scalar() or 0
                
                query_total_crawled = select(func.count(Match.match_id)).where(Match.is_crawled == True)
                total_crawled = (await db.execute(query_total_crawled)).scalar() or 0

                payload = {
                    "is_active": is_active,
                    "extraction_only": extraction_only, # Ajout obligatoire
                    "total_requests": total_requests,
                    "players_pending": players_pending,
                    "matches_pending": matches_pending,
                    "total_crawled": total_crawled
                }
                
                yield f"data: {json.dumps(payload)}\n\n"
                await asyncio.sleep(2.0)
                
        except asyncio.CancelledError:
            logger.info("Connexion SSE Crawler fermée par le client.")
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/purge", response_model=Dict[str, Any])
async def purge_crawler_queues(db: AsyncSession = Depends(get_db)):
    """
    Vide de force les tables crawler_queue et crawler_match_queue.
    Permet de réinitialiser le système en cas de test bloqué.
    Ne supprime PAS les parties ingérées (table Match reste intacte).
    """
    service = CrawlerService(db)
    try:
        # On s'assure que le crawler est en pause avant de purger
        await service.toggle_crawler(False)
        await service.purge_queues()
        return {"status": "success", "message": "Files d'attente purgées avec succès. Le crawler est en pause."}
    except Exception as e:
        logger.error(f"Erreur lors de la purge des files: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")
    

@router.post("/toggle-extraction", response_model=Dict[str, Any])
async def toggle_extraction_mode(
    extraction_only: bool = Body(..., embed=True),
    db: AsyncSession = Depends(get_db)
):
    service = CrawlerService(db)
    state = await service.toggle_extraction_only(extraction_only)
    return {"status": "success", "extraction_only": state.extraction_only}