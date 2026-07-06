# -*- coding: utf-8 -*-
"""
===============================================================================
FICHIER : backend/app/services/sync_service.py
PROJET  : JungleDiff

DESCRIPTION :
Service centralisé orchestrant la synchronisation des données et de l'historique.
Gère la résolution d'identité Riot Account V1 et pilote la file d'attente Redis/ARQ.

MODIFICATIONS :
- Version intégrale non tronquée.
- Transition définitive vers l'ingestion chronologique unifiée (Global Fetch)
  pour éliminer les distorsions temporelles de la pagination frontend.
===============================================================================
"""

import time
import asyncio
from typing import Dict, Any, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from arq import create_pool
from arq.connections import RedisSettings

from app.core.config import settings
from app.db.models import Player, Match, MatchTimeline
from app.services.riot_client import RiotClient

class SyncService:
    def __init__(self, db: AsyncSession):
        """Initialise le service avec la session de base de données et le client Riot."""
        self.db = db
        self.client = RiotClient(settings.RIOT_API_KEY)

    @staticmethod
    def _get_match_timestamp_approx(match_id: str) -> int:
        """
        Extrait l'identifiant numérique de la partie pour effectuer un tri 
        chronologique estimé avant traitement.
        """
        try:
            return int(match_id.split('_')[1])
        except (IndexError, ValueError):
            return 0
        
    async def sync_player_profile(self, server: str, game_name: str, tag_line: str) -> Dict[str, Any]:
        """
        Coordonne le rafraîchissement complet du profil d'un joueur et planifie 
        l'ingestion des 60 derniers matchs de façon strictement linéaire.
        """
        routing = self.client.get_routing(server)
        continent = routing["continent"]
        region = routing["region"]

        # 1. Résolution de l'identité via Riot Account V1
        account = await self.client.get_account_by_riot_id(continent, game_name, tag_line, fail_fast=True)
        if not account:
            return {"error": "Joueur introuvable. Vérifiez le pseudo et le tag."}
        puuid = account.get("puuid")

        # 2. Extraction des caractéristiques du profil d'invocateur
        summoner_data = await self.client.get_summoner_by_puuid(region, puuid, fail_fast=True)
        if not summoner_data:
            return {"error": f"Impossible de récupérer le profil sur le serveur {server}."}

        # 3. Traitement des ligues et des points d'étape classés
        summoner_id = summoner_data.get("id")
        tier, rank, lp = None, None, None
        
        if summoner_id:
            league_data = await self.client.get_league_entries(region, summoner_id, fail_fast=True)
            for entry in league_data:
                if entry.get("queueType") == "RANKED_SOLO_5x5":
                    tier = entry.get("tier")
                    rank = entry.get("rank")
                    lp = entry.get("leaguePoints")
                    break

        # 4. Exécution du Global Fetch (Agnostique du mode de jeu au niveau de la requête API)
        all_fetched_ids = await self.client.get_match_ids(continent, puuid, start=0, count=60, fail_fast=True)
        
        # 5. Détermination des deltas d'ingestion (Filtre anti-doublon SQL local)
        new_match_ids = []
        if all_fetched_ids:
            query = select(Match.match_id).where(Match.match_id.in_(all_fetched_ids))
            result = await self.db.execute(query)
            existing_ids = set(result.scalars().all())
            new_match_ids = [m_id for m_id in all_fetched_ids if m_id not in existing_ids]

        # 6. Persistance des attributs mis à jour de l'entité Player
        query_player = select(Player).where(Player.puuid == puuid)
        result_player = await self.db.execute(query_player)
        player = result_player.scalar_one_or_none()

        current_time = int(time.time() * 1000)
        if not player:
            player = Player(puuid=puuid)
            self.db.add(player)
            
        player.riot_id_name = account.get("gameName", game_name)
        player.riot_id_tagline = account.get("tagLine", tag_line)
        player.summoner_id = summoner_id
        player.profile_icon_id = summoner_data.get("profileIconId", 1)
        player.summoner_level = summoner_data.get("summonerLevel", 1)
        player.tier = tier
        player.rank = rank
        player.league_points = lp
        player.last_update_timestamp = current_time

        await self.db.commit()

        # 7. Distribution ordonnée des tâches vers le broker ARQ
        tasks_enqueued = 0
        if new_match_ids:
            new_match_ids.sort(key=self._get_match_timestamp_approx, reverse=True)
            
            redis_pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
            for i, m_id in enumerate(new_match_ids):
                fetch_timeline = (i < 5)
                
                await redis_pool.enqueue_job(
                    'process_match_ingestion', 
                    m_id, 
                    continent, 
                    fetch_timeline,
                    _job_id=f"ingest_{m_id}",
                    _queue_name='default'
                )
                tasks_enqueued += 1
            await redis_pool.aclose()

        return {
            "status": "success",
            "puuid": puuid,
            "profile_updated": True,
            "new_matches_found": len(new_match_ids),
            "tasks_enqueued": tasks_enqueued,
            "warning": "Rank ignoré (absence d'ID Riot)" if not summoner_id else None
        }

    async def fetch_older_matches(self, server: str, puuid: str, start_index: int) -> Dict[str, Any]:
        """
        Requête un segment d'historique lointain dans le cadre du défilement infini.
        Garantit le respect de l'alignement linéaire de l'axe temporel.
        """
        routing = self.client.get_routing(server)
        continent = routing["continent"]

        all_fetched_ids = await self.client.get_match_ids(continent, puuid, start=start_index, count=60)
                
        new_match_ids = []
        if all_fetched_ids:
            query = select(Match.match_id).where(Match.match_id.in_(all_fetched_ids))
            result = await self.db.execute(query)
            existing_ids = set(result.scalars().all())
            new_match_ids = [m_id for m_id in all_fetched_ids if m_id not in existing_ids]

        tasks_enqueued = 0
        if new_match_ids:
            redis_pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
            for m_id in new_match_ids:
                await redis_pool.enqueue_job(
                    'process_match_ingestion', 
                    m_id, 
                    continent, 
                    False, 
                    _job_id=f"ingest_{m_id}",
                    _queue_name='default'
                )
                tasks_enqueued += 1
            await redis_pool.aclose()

        return {
            "status": "success",
            "start_index": start_index,
            "new_matches_found": len(new_match_ids),
            "tasks_enqueued": tasks_enqueued
        }
    
    async def trigger_timeline_prefetch(self, target_ids: List[str], server: str) -> Dict[str, Any]:
        """
        Propage une demande de pré-téléchargement urgent vers la file prioritaire d'ARQ.
        """
        routing = self.client.get_routing(server)
        continent = routing["continent"]

        if not target_ids:
             return {"status": "skipped", "reason": "Aucune cible fournie"}

        query_missing = select(MatchTimeline.match_id).where(MatchTimeline.match_id.in_(target_ids))
        result_missing = await self.db.execute(query_missing)
        existing_timelines = set(result_missing.scalars().all())

        missing_targets = [m_id for m_id in target_ids if m_id not in existing_timelines]

        tasks_enqueued = 0
        if missing_targets:
            redis_pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
            for m_id in missing_targets:
                await redis_pool.enqueue_job(
                    'process_timeline_only', 
                    m_id, 
                    continent, 
                    _job_id=f"timeline_{m_id}",
                    _queue_name='high_priority'
                )
                tasks_enqueued += 1
            await redis_pool.aclose()

        return {
            "status": "triggered",
            "enqueued": tasks_enqueued,
            "targets": missing_targets
        }