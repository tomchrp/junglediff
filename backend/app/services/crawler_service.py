"""
===============================================================================
FICHIER : backend/app/services/crawler_service.py
PROJET  : JungleDiff

DESCRIPTION :
Moteur autonome d'ingestion massive (Big Data). 
Orchestre l'extraction des données Riot en respectant les quotas (Rate Limit).

MODIFICATIONS (CORRECTION MÉTRIQUES AVANCÉES) :
- Refonte de la fonction _update_aggregated_metric pour supporter les
  dictionnaires imbriqués (sous-clés).
- Extraction de l'ID de file (queueId) lors du trimming pour incrémenter
  les statistiques précises par type de partie (SoloQ, Flex, Draft).
- Extraction du Tier lors de la traduction Summoner pour cartographier
  la répartition de la base de joueurs par division.
===============================================================================
"""

import time
import logging
import asyncio
from typing import Optional
from sqlalchemy import select, update, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy.dialects.postgresql import insert

from app.core.config import settings
from app.db.models import (CrawlerState, CrawlerQueue, CrawlerMatchQueue, Match, 
                           Player, MatchParticipant, MatchTimeline, CrawlerSummonerQueue)
from app.services.riot_client import RiotClient
from app.services.trimmer import DataTrimmer
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)

class CrawlerService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = RiotClient(settings.RIOT_API_KEY)
        self.storage = StorageService()

    async def get_or_create_state(self) -> CrawlerState:
        query = select(CrawlerState).where(CrawlerState.id == 1)
        result = await self.db.execute(query)
        state = result.scalar_one_or_none()
        if state:
            await self.db.refresh(state)
        else:
            state = CrawlerState(id=1, is_active=False, crawler_mode="DISCOVERY_AND_DETAILS", total_requests_made=0, aggregated_metrics={})
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

    async def set_crawler_mode(self, mode: str) -> CrawlerState:
        valid_modes = ["DISCOVERY_AND_DETAILS", "DETAILS_ONLY", "TIMELINES_ONLY"]
        if mode not in valid_modes:
            raise ValueError(f"Mode invalide. Choix acceptés : {valid_modes}")
            
        state = await self.get_or_create_state()
        state.crawler_mode = mode
        await self.db.commit()
        return state

    async def seed_crawler(self, puuid: str) -> None:
        current_time = int(time.time() * 1000)
        stmt = insert(CrawlerQueue).values(
            puuid=puuid, 
            status="PENDING", 
            discovery_depth=0, 
            discovered_at=current_time
        ).on_conflict_do_update(
            index_elements=['puuid'],
            set_=dict(status="PENDING", discovery_depth=0, discovered_at=current_time)
        )
        await self.db.execute(stmt)
        await self.db.commit()

    async def purge_queues(self) -> None:
        await self.db.execute(text("TRUNCATE TABLE crawler_queue, crawler_match_queue, crawler_summoner_queue RESTART IDENTITY"))
        state = await self.get_or_create_state()
        state.aggregated_metrics = {}
        await self.db.commit()

    async def _update_aggregated_metric(self, category: str, subkey: str = None, increment: int = 1) -> None:
        """
        Met à jour le compteur JSON en base de manière transactionnelle.
        Intègre un système d'auto-guérison : si le type de la donnée en base
        est détecté comme corrompu, il est automatiquement réinitialisé.
        """
        state = await self.get_or_create_state()
        metrics = dict(state.aggregated_metrics) if state.aggregated_metrics else {}
        
        if subkey:
            if category not in metrics or not isinstance(metrics[category], dict):
                metrics[category] = {} # Auto-guérison
            metrics[category][subkey] = metrics[category].get(subkey, 0) + increment
        else:
            if category in metrics and not isinstance(metrics[category], int):
                metrics[category] = 0 # Auto-guérison
            metrics[category] = metrics.get(category, 0) + increment
            
        state.aggregated_metrics = metrics
        self.db.add(state)

    async def process_next_summoner(self) -> Optional[str]:
        state = await self.get_or_create_state()
        if not state.is_active or state.crawler_mode == "TIMELINES_ONLY": 
            return None

        query = text("SELECT summoner_id, tier, rank FROM crawler_summoner_queue WHERE status = 'PENDING' ORDER BY discovered_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED")
        result = await self.db.execute(query)
        row = result.fetchone()
        if not row: return None

        s_id, tier, rank = row[0], row[1], row[2]
        
        await self.db.execute(update(CrawlerSummonerQueue).where(CrawlerSummonerQueue.summoner_id == s_id).values(status="PROCESSING"))
        await self.db.commit()

        try:
            routing = self.client.get_routing("EUW")
            summoner_data = await self.client.get_summoner_by_id(routing["platform"], s_id)
            state.total_requests_made += 1
            
            if summoner_data and "puuid" in summoner_data:
                puuid = summoner_data["puuid"]
                current_time = int(time.time() * 1000)

                stmt_player = insert(Player).values(
                    puuid=puuid,
                    summoner_id=s_id,
                    riot_id_name="Unknown", 
                    riot_id_tagline="UNK",
                    tier=tier,
                    rank=rank
                ).on_conflict_do_nothing(index_elements=['puuid'])
                await self.db.execute(stmt_player)

                stmt_queue = insert(CrawlerQueue).values(
                    puuid=puuid,
                    status="PENDING",
                    discovery_depth=1,
                    discovered_at=current_time
                ).on_conflict_do_nothing(index_elements=['puuid'])
                await self.db.execute(stmt_queue)
                
                await self._update_aggregated_metric('summoners_translated')
                # NOUVEAU : Incrémentation du compteur par division
                await self._update_aggregated_metric('players_by_tier', tier)

            await self.db.execute(update(CrawlerSummonerQueue).where(CrawlerSummonerQueue.summoner_id == s_id).values(status="COMPLETED"))
            await self.db.commit()
            return puuid

        except Exception as e:
            logger.error(f"Crawler Summoner Translation Error ({s_id}): {e}")
            await self.db.execute(update(CrawlerSummonerQueue).where(CrawlerSummonerQueue.summoner_id == s_id).values(status="FAILED"))
            await self.db.commit()
            return None

    async def process_next_player(self) -> Optional[str]:
        """
        Dépile la file de joueurs et récupère leur historique de matchs (Match-V5).
        Filtre strictement les identifiants pour ignorer TR1, EUN1, ou RU.
        """
        state = await self.get_or_create_state()
        if not state.is_active or state.crawler_mode == "TIMELINES_ONLY": 
            return None

        query = text("SELECT puuid FROM crawler_queue WHERE status = 'PENDING' ORDER BY discovered_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED")
        result = await self.db.execute(query)
        row = result.fetchone()
        if not row: return None

        target_puuid = row[0]
        await self.db.execute(update(CrawlerQueue).where(CrawlerQueue.puuid == target_puuid).values(status="PROCESSING"))
        await self.db.commit()

        try:
            routing = self.client.get_routing("EUW")
            api_tasks = [
                self.client.get_match_ids(routing["continent"], target_puuid, queue=420, count=20),
                self.client.get_match_ids(routing["continent"], target_puuid, queue=440, count=20)
            ]
            
            lists_of_ids = await asyncio.gather(*api_tasks, return_exceptions=True)
            state.total_requests_made += 2
            
            all_fetched_ids = set()
            for l in lists_of_ids:
                if isinstance(l, list):
                    # FILTRE STRICT : On ignore la pollution continentale de Riot
                    filtered = [m_id for m_id in l if m_id.startswith("EUW1_")]
                    all_fetched_ids.update(filtered)
                    
            if all_fetched_ids:
                current_time = int(time.time() * 1000)
                matches_to_insert = [{"match_id": m_id, "status": "PENDING", "discovered_at": current_time} for m_id in all_fetched_ids]
                
                stmt = insert(CrawlerMatchQueue).values(matches_to_insert).on_conflict_do_nothing(index_elements=['match_id'])
                await self.db.execute(stmt)

            await self.db.execute(update(CrawlerQueue).where(CrawlerQueue.puuid == target_puuid).values(status="COMPLETED"))
            await self.db.commit()
            return target_puuid
            
        except Exception as e:
            logger.error(f"Crawler Player Error ({target_puuid}): {e}")
            await self.db.execute(update(CrawlerQueue).where(CrawlerQueue.puuid == target_puuid).values(status="FAILED"))
            await self.db.commit()
            return None

    async def process_next_match(self) -> Optional[str]:
        state = await self.get_or_create_state()
        if not state.is_active: return None

        if state.crawler_mode == "TIMELINES_ONLY":
            return await self._process_timeline_backfill(state)
        else:
            return await self._process_details_ingestion(state)

    async def _process_timeline_backfill(self, state: CrawlerState) -> Optional[str]:
        query = text("SELECT match_id FROM matches WHERE is_crawled = true AND timeline_status = 'PENDING' LIMIT 1 FOR UPDATE SKIP LOCKED")
        result = await self.db.execute(query)
        row = result.fetchone()
        if not row: return None

        target_match_id = row[0]
        
        try:
            routing = self.client.get_routing("EUW")
            timeline_data = await self.client.get_match_timeline(routing["continent"], target_match_id)
            state.total_requests_made += 1

            if not timeline_data:
                await self.db.execute(update(Match).where(Match.match_id == target_match_id).values(timeline_status="UNAVAILABLE"))
                await self.db.commit()
                return f"{target_match_id} (TIMELINES_ONLY - 404 UNAVAILABLE)"

            await self.storage.upload_json(target_match_id, "timeline", timeline_data)
            trimmed_timeline = DataTrimmer.trim_match_timeline(timeline_data)

            new_timeline = MatchTimeline(match_id=target_match_id, raw_timeline_data=trimmed_timeline)
            self.db.add(new_timeline)

            await self.db.execute(update(Match).where(Match.match_id == target_match_id).values(timeline_status="FETCHED"))
            
            # Récupération contextuelle de l'ID de la file pour les métriques
            match_result = await self.db.execute(select(Match).where(Match.match_id == target_match_id))
            match_record = match_result.scalar_one_or_none()
            queue_id = str(match_record.raw_match_data.get("info", {}).get("queueId", "unknown")) if match_record and match_record.raw_match_data else "unknown"

            await self._update_aggregated_metric('timelines_crawled')
            await self._update_aggregated_metric('timelines_by_queue', queue_id)
            await self.db.commit()
            
            return f"{target_match_id} (TIMELINES_ONLY - SUCCESS)"

        except Exception as e:
            logger.error(f"Crawler Timeline Error ({target_match_id}): {e}")
            await self.db.rollback()
            return None

    async def _process_details_ingestion(self, state: CrawlerState) -> Optional[str]:
        query = text("SELECT match_id FROM crawler_match_queue WHERE status = 'PENDING' ORDER BY discovered_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED")
        result = await self.db.execute(query)
        row = result.fetchone()
        if not row: return None

        target_match_id = row[0]
        await self.db.execute(update(CrawlerMatchQueue).where(CrawlerMatchQueue.match_id == target_match_id).values(status="PROCESSING"))
        await self.db.commit()

        try:
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

                await self.storage.upload_json(target_match_id, "details", raw_match)

                trimmer = DataTrimmer()
                trimmed_match = trimmer.trim_match_details(raw_match)
                
                new_db_match = Match(
                    match_id=target_match_id,
                    game_version=trimmed_match["info"].get("gameVersion", "unknown"),
                    game_duration=trimmed_match["info"].get("gameDuration", 0),
                    creation_timestamp=trimmed_match["info"].get("gameCreation", 0),
                    is_crawled=True,
                    raw_match_data=trimmed_match,
                    timeline_status="PENDING" 
                )
                self.db.add(new_db_match)

            current_time = int(time.time() * 1000)
            participants = trimmed_match.get("info", {}).get("participants", [])
            queue_id = str(trimmed_match.get("info", {}).get("queueId", "unknown"))
            
            players_to_insert = []
            crawlers_to_insert = []
            match_participants_to_insert = []
            
            for participant in participants:
                p_puuid = participant.get("puuid")
                if not p_puuid: continue

                players_to_insert.append({
                    "puuid": p_puuid,
                    "riot_id_name": participant.get("riotIdGameName", "Unknown"),
                    "riot_id_tagline": participant.get("riotIdTagline", "UNK")
                })
                    
                if state.crawler_mode == "DISCOVERY_AND_DETAILS":
                    crawlers_to_insert.append({
                        "puuid": p_puuid,
                        "status": "PENDING",
                        "discovery_depth": 1,
                        "discovered_at": current_time
                    })

                match_participants_to_insert.append({
                    "match_id": target_match_id,
                    "puuid": p_puuid,
                    "team_id": participant.get("teamId", 0),
                    "champion_id": participant.get("championId", 0),
                    "lane": participant.get("teamPosition", "NONE"),
                    "win": participant.get("win", False),
                    "kills": participant.get("kills", 0),
                    "deaths": participant.get("deaths", 0),
                    "assists": participant.get("assists", 0)
                })

            if players_to_insert:
                stmt_p = insert(Player).values(players_to_insert).on_conflict_do_nothing(index_elements=['puuid'])
                await self.db.execute(stmt_p)
                
            if crawlers_to_insert:
                stmt_c = insert(CrawlerQueue).values(crawlers_to_insert).on_conflict_do_nothing(index_elements=['puuid'])
                await self.db.execute(stmt_c)
                
            if match_participants_to_insert:
                stmt_mp = insert(MatchParticipant).values(match_participants_to_insert).on_conflict_do_nothing(index_elements=['match_id', 'puuid'])
                await self.db.execute(stmt_mp)

            await self.db.execute(update(CrawlerMatchQueue).where(CrawlerMatchQueue.match_id == target_match_id).values(status="COMPLETED"))
            
            if not existing_match_data:
                await self._update_aggregated_metric('details_crawled', 1)
                await self._update_aggregated_metric('details_by_queue', queue_id)
                
            await self.db.commit()
            
            return f"{target_match_id} ({'Tremplin Local' if existing_match_data else 'API Fetch'})"

        except Exception as e:
            logger.error(f"Crawler Match Error ({target_match_id}): {e}")
            await self.db.rollback()
            await self.db.execute(update(CrawlerMatchQueue).where(CrawlerMatchQueue.match_id == target_match_id).values(status="FAILED"))
            await self.db.commit()
            return None