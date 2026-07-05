# backend/app/services/crawler_service.py

"""
===============================================================================
FICHIER : backend/app/services/crawler_service.py
PROJET  : JungleDiff

DESCRIPTION :
Moteur autonome d'ingestion massive (Big Data). 
Orchestre l'extraction des données Riot en respectant les quotas (Rate Limit).

MODIFICATIONS (PHASE 4 BIG DATA & MINIO) :
- Remplacement du mode binaire (extraction_only) par la machine à 3 états 
  (DISCOVERY_AND_DETAILS, DETAILS_ONLY, TIMELINES_ONLY).
- Sécurisation Absolute Cold Storage : Toute donnée API Riot est envoyée à 
  MinIO (StorageService) AVANT le passage dans le DataTrimmer.
- Implémentation du mode "Rattrapage" (_process_timeline_backfill) pour 
  peupler l'ingénierie analytique (Golds/XP à 15min) sur l'historique existant.
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
from app.db.models import CrawlerState, CrawlerQueue, CrawlerMatchQueue, Match, Player, MatchParticipant, MatchTimeline
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
            await self.db.refresh(state) # Force le rechargement depuis la DB
        else:
            state = CrawlerState(id=1, is_active=False, crawler_mode="DISCOVERY_AND_DETAILS", total_requests_made=0)
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
        """
        Remplace toggle_extraction_only. Pilote la vitesse d'ingestion.
        """
        valid_modes = ["DISCOVERY_AND_DETAILS", "DETAILS_ONLY", "TIMELINES_ONLY"]
        if mode not in valid_modes:
            raise ValueError(f"Mode invalide. Choix acceptés : {valid_modes}")
            
        state = await self.get_or_create_state()
        state.crawler_mode = mode
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
        """
        Explore le profil d'un joueur pour récupérer ses Match IDs.
        Ignoré si le crawler est en mode rattrapage de Timelines.
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
            
            # TRIPLE APPEL (Ciblage strict : Draft, SoloQ, Flex)
            api_tasks = [
                self.client.get_match_ids(routing["continent"], target_puuid, queue=420, count=20),
                self.client.get_match_ids(routing["continent"], target_puuid, queue=440, count=20),
                self.client.get_match_ids(routing["continent"], target_puuid, queue=400, count=20)
            ]
            
            lists_of_ids = await asyncio.gather(*api_tasks, return_exceptions=True)
            state.total_requests_made += 3
            
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


    async def process_next_match(self) -> Optional[str]:
        """Aiguilleur principal de la donnée de match selon le mode actif."""
        state = await self.get_or_create_state()
        if not state.is_active: return None

        logger.info(f"DEBUG - Mode Crawler Actif: {state.crawler_mode}")

        if state.crawler_mode == "TIMELINES_ONLY":
            return await self._process_timeline_backfill(state)
        else:
            return await self._process_details_ingestion(state)


    async def _process_timeline_backfill(self, state: CrawlerState) -> Optional[str]:
        """
        Nouveau Mode : Scanne la base à la recherche de matchs orphelins de timeline.
        Télécharge, extrait l'économie à 15 minutes, et met à jour le modèle relationnel.
        """
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
                # SÉCURITÉ 404 RIOT
                await self.db.execute(update(Match).where(Match.match_id == target_match_id).values(timeline_status="UNAVAILABLE"))
                await self.db.commit()
                return f"{target_match_id} (TIMELINES_ONLY - 404 UNAVAILABLE)"

            # INJECTION COLD STORAGE
            await self.storage.upload_json(target_match_id, "timeline", timeline_data)
            
            # ELAGAGE
            trimmed_timeline = DataTrimmer.trim_match_timeline(timeline_data)

            # EXTRACTION DES STATS 15 MIN
            match_result = await self.db.execute(select(Match).where(Match.match_id == target_match_id))
            match_record = match_result.scalar_one_or_none()

            metrics_dict = {}
            if match_record and match_record.raw_match_data:
                metrics_dict = DataTrimmer.extract_timeline_metrics(match_record.raw_match_data, trimmed_timeline)

            # INJECTION WARM STORAGE
            new_timeline = MatchTimeline(match_id=target_match_id, raw_timeline_data=trimmed_timeline)
            self.db.add(new_timeline)

            # MISE À JOUR HOT STORAGE (Métriques)
            if metrics_dict:
                for puuid, m in metrics_dict.items():
                    await self.db.execute(
                        update(MatchParticipant)
                        .where(MatchParticipant.match_id == target_match_id)
                        .where(MatchParticipant.puuid == puuid)
                        .values(
                            gold_diff_15m=m.get("gold_diff_15m"),
                            xp_diff_15m=m.get("xp_diff_15m"),
                            is_snowballing=m.get("is_snowballing")
                        )
                    )

            # FERMETURE DU CIRCUIT
            await self.db.execute(update(Match).where(Match.match_id == target_match_id).values(timeline_status="FETCHED"))
            await self.db.commit()
            
            return f"{target_match_id} (TIMELINES_ONLY - SUCCESS)"

        except Exception as e:
            logger.error(f"Crawler Timeline Error ({target_match_id}): {e}")
            await self.db.rollback()
            return None


    async def _process_details_ingestion(self, state: CrawlerState) -> Optional[str]:
        """Mode historique : Dépile la CrawlerMatchQueue et ingère la structure de base."""
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

                # INJECTION COLD STORAGE STRICTE
                await self.storage.upload_json(target_match_id, "details", raw_match)

                trimmer = DataTrimmer()
                trimmed_match = trimmer.trim_match_details(raw_match)
                
                # INJECTION WARM STORAGE
                new_db_match = Match(
                    match_id=target_match_id,
                    game_version=trimmed_match["info"].get("gameVersion", "unknown"),
                    game_duration=trimmed_match["info"].get("gameDuration", 0),
                    creation_timestamp=trimmed_match["info"].get("gameCreation", 0),
                    is_crawled=True,
                    raw_match_data=trimmed_match,
                    timeline_status="PENDING" # Préparation pour le backfill futur
                )
                self.db.add(new_db_match)

            current_time = int(time.time() * 1000)
            participants = trimmed_match.get("info", {}).get("participants", [])
            
            for participant in participants:
                p_puuid = participant.get("puuid")
                if not p_puuid: continue

                # 1. Joueur Global
                player_exist = await self.db.execute(select(Player.puuid).where(Player.puuid == p_puuid))
                is_new_player = not player_exist.scalar_one_or_none()

                if is_new_player:
                    new_player = Player(
                        puuid=p_puuid,
                        riot_id_name=participant.get("riotIdGameName", "Unknown"),
                        riot_id_tagline=participant.get("riotIdTagline", "UNK")
                    )
                    self.db.add(new_player)
                    
                # 2. Snowballing exclusif au mode DISCOVERY
                if state.crawler_mode == "DISCOVERY_AND_DETAILS":
                    queue_exist = await self.db.execute(select(CrawlerQueue.puuid).where(CrawlerQueue.puuid == p_puuid))
                    if not queue_exist.scalar_one_or_none():
                        self.db.add(CrawlerQueue(puuid=p_puuid, status="PENDING", discovery_depth=1, discovered_at=current_time))

                # 3. Injection Hot Storage
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