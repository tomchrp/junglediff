"""
===============================================================================
FICHIER : backend/app/services/crawler_service.py
PROJET  : JungleDiff
===============================================================================
"""

import time
import logging
import asyncio
from typing import Optional
from sqlalchemy import select, update, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.db.models import CrawlerState, CrawlerQueue, CrawlerMatchQueue, Match, Player, MatchParticipant
from app.services.riot_client import RiotClient
from app.services.trimmer import DataTrimmer

logger = logging.getLogger(__name__)

class CrawlerService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = RiotClient(settings.RIOT_API_KEY)

    async def get_or_create_state(self) -> CrawlerState:
        query = select(CrawlerState).where(CrawlerState.id == 1)
        result = await self.db.execute(query)
        state = result.scalar_one_or_none()
        if state:
            await self.db.refresh(state) # Force le rechargement depuis la DB
        else:
            state = CrawlerState(id=1, is_active=False, extraction_only=False, total_requests_made=0)
            self.db.add(state)
            await self.db.commit()
            await self.db.refresh(state)
        return state

    async def toggle_crawler(self, is_active: bool) -> CrawlerState:
        state = await self.get_or_create_state()
        state.is_active = is_active
        if is_active and not state.started_at:
            state.started_at = int(time.time() * 1000)
        await self.db.commit()
        return state

    async def seed_crawler(self, puuid: str) -> None:
        """Injecte ou force la réinitialisation d'une graine avec une requête SQL brute."""
        current_time = int(time.time() * 1000)
        
        # Vérifie si le joueur existe dans la file
        query = select(CrawlerQueue).where(CrawlerQueue.puuid == puuid)
        result = await self.db.execute(query)
        existing_seed = result.scalar_one_or_none()
        
        if not existing_seed:
            seed = CrawlerQueue(puuid=puuid, status="PENDING", discovery_depth=0, discovered_at=current_time)
            self.db.add(seed)
        else:
            # Forçage SQL strict pour garantir la mise à jour (contourne le cache ORM)
            await self.db.execute(
                update(CrawlerQueue)
                .where(CrawlerQueue.puuid == puuid)
                .values(status="PENDING", discovery_depth=0, discovered_at=current_time)
            )
        await self.db.commit()

    async def process_next_player(self) -> Optional[str]:
        state = await self.get_or_create_state()
        if not state.is_active: return None

        query = text("SELECT puuid FROM crawler_queue WHERE status = 'PENDING' ORDER BY discovered_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED")
        result = await self.db.execute(query)
        row = result.fetchone()
        if not row: return None

        target_puuid = row[0]
        await self.db.execute(update(CrawlerQueue).where(CrawlerQueue.puuid == target_puuid).values(status="PROCESSING"))
        await self.db.commit()

        try:
            routing = self.client.get_routing("EUW")
            
            # TRIPLE APPEL (Alignement avec sync_service)
            # Ciblage strict : Draft (400), SoloQ (420), Flex (440)
            api_tasks = [
                self.client.get_match_ids(routing["continent"], target_puuid, queue=420, count=20),
                self.client.get_match_ids(routing["continent"], target_puuid, queue=440, count=20),
                self.client.get_match_ids(routing["continent"], target_puuid, queue=400, count=20)
            ]
            
            
            lists_of_ids = await asyncio.gather(*api_tasks, return_exceptions=True)
            state.total_requests_made += 3 # On a fait 3 requêtes
            
            # Fusion et dédoublonnage
            all_fetched_ids = set()
            for l in lists_of_ids:
                if isinstance(l, list):
                    all_fetched_ids.update(l)
                    
            match_ids = list(all_fetched_ids)

            if match_ids:
                current_time = int(time.time() * 1000)
                for m_id in match_ids:
                    try:
                        self.db.add(CrawlerMatchQueue(match_id=m_id, status="PENDING", discovered_at=current_time))
                        await self.db.commit()
                    except IntegrityError:
                        await self.db.rollback() 
                        await self.db.execute(update(CrawlerMatchQueue).where(CrawlerMatchQueue.match_id == m_id).values(status="PENDING"))
                        await self.db.commit()

            await self.db.execute(update(CrawlerQueue).where(CrawlerQueue.puuid == target_puuid).values(status="COMPLETED"))
            await self.db.commit()
            return target_puuid
        except Exception as e:
            logger.error(f"Crawler Player Error ({target_puuid}): {e}")
            await self.db.execute(update(CrawlerQueue).where(CrawlerQueue.puuid == target_puuid).values(status="FAILED"))
            await self.db.commit()
            return None

    async def purge_queues(self) -> None:
        """Vide entièrement les files d'attente pour repartir sur une base saine."""
        await self.db.execute(text("TRUNCATE TABLE crawler_queue, crawler_match_queue RESTART IDENTITY"))
        await self.db.commit()

    async def toggle_extraction_only(self, extraction_only: bool) -> CrawlerState:
        """Active ou désactive le bridage de l'exploration."""
        state = await self.get_or_create_state()
        state.extraction_only = extraction_only
        await self.db.commit()
        return state

    async def process_next_match(self) -> Optional[str]:
        state = await self.get_or_create_state()
        await self.db.refresh(state)
        logger.info(f"DEBUG - Mode Extraction Only actif: {state.extraction_only}") # <--- AJOUTE CECI

        
        if not state.is_active: return None

        query = text("SELECT match_id FROM crawler_match_queue WHERE status = 'PENDING' ORDER BY discovered_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED")
        result = await self.db.execute(query)
        row = result.fetchone()
        if not row: return None

        target_match_id = row[0]
        await self.db.execute(update(CrawlerMatchQueue).where(CrawlerMatchQueue.match_id == target_match_id).values(status="PROCESSING"))
        await self.db.commit()

        try:
            # Vérification de l'existence (Cold Storage)
            exist_query = select(Match.raw_match_data).where(Match.match_id == target_match_id)
            existing_match_data = (await self.db.execute(exist_query)).scalar_one_or_none()
            
            trimmed_match = None
            if existing_match_data:
                trimmed_match = existing_match_data
            else:
                routing = self.client.get_routing("EUW")
                raw_match = await self.client.get_match_details(routing["continent"], target_match_id)
                state.total_requests_made += 1
                
                if not raw_match or "info" not in raw_match:
                    raise ValueError("Payload Match Details invalide")

                trimmer = DataTrimmer()
                trimmed_match = trimmer.trim_match_details(raw_match)
                
                # INJECTION COLD STORAGE
                new_db_match = Match(
                    match_id=target_match_id,
                    game_version=trimmed_match["info"].get("gameVersion", "unknown"),
                    game_duration=trimmed_match["info"].get("gameDuration", 0),
                    creation_timestamp=trimmed_match["info"].get("gameCreation", 0),
                    is_crawled=True,
                    raw_match_data=trimmed_match
                )
                self.db.add(new_db_match)

            # EXTRACTION DES JOUEURS (HOT STORAGE + SNOWBALLING)
            current_time = int(time.time() * 1000)
            participants = trimmed_match.get("info", {}).get("participants", [])
            
            for participant in participants:
                p_puuid = participant.get("puuid")
                if not p_puuid: continue

                # 1. Vérifier si le joueur est connu dans le système global
                player_exist = await self.db.execute(select(Player.puuid).where(Player.puuid == p_puuid))
                is_new_player = not player_exist.scalar_one_or_none()

                if is_new_player:
                    new_player = Player(
                        puuid=p_puuid,
                        riot_id_name=participant.get("riotIdGameName", "Unknown"),
                        riot_id_tagline=participant.get("riotIdTagline", "UNK")
                    )
                    self.db.add(new_player)
                    
                # 2. BRIDAGE ET SNOWBALLING (Désormais indépendant de is_new_player)
                if not state.extraction_only:
                    # Vérification SQL propre : le joueur est-il déjà dans la file d'attente ?
                    queue_exist = await self.db.execute(select(CrawlerQueue.puuid).where(CrawlerQueue.puuid == p_puuid))
                    if not queue_exist.scalar_one_or_none():
                        self.db.add(CrawlerQueue(puuid=p_puuid, status="PENDING", discovery_depth=1, discovered_at=current_time))

                # 3. INJECTION HOT STORAGE (MatchParticipant)
                mp_exist = await self.db.execute(select(MatchParticipant.id).where(MatchParticipant.match_id == target_match_id).where(MatchParticipant.puuid == p_puuid))
                if not mp_exist.scalar_one_or_none():
                    new_mp = MatchParticipant(
                        match_id=target_match_id,
                        puuid=p_puuid,
                        team_id=participant.get("teamId", 0),
                        champion_id=participant.get("championId", 0),
                        lane=participant.get("lane", "NONE"),
                        position=participant.get("teamPosition", "NONE"),
                        win=participant.get("win", False),
                        kills=participant.get("kills", 0),
                        deaths=participant.get("deaths", 0),
                        assists=participant.get("assists", 0)
                    )
                    self.db.add(new_mp)

            await self.db.commit()
            await self.db.execute(update(CrawlerMatchQueue).where(CrawlerMatchQueue.match_id == target_match_id).values(status="COMPLETED"))
            await self.db.commit()
            
            return f"{target_match_id} ({'Tremplin Local' if existing_match_data else 'API Fetch'})"

        except Exception as e:
            logger.error(f"Crawler Match Error ({target_match_id}): {e}")
            await self.db.rollback()
            await self.db.execute(update(CrawlerMatchQueue).where(CrawlerMatchQueue.match_id == target_match_id).values(status="FAILED"))
            await self.db.commit()
            return None