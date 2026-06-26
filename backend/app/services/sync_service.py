"""
===============================================================================
FICHIER : backend/app/services/sync_service.py
PROJET  : JungleDiff

DESCRIPTION :
Cœur de la logique métier pour l'ingestion différentielle. 
Gère la synchronisation initiale (Triple Appel Léger), le Deep Fetch pour
la pagination historique, et l'orchestration des workers ARQ avec 
verrouillage anti-doublon des tâches.

MODIFICATIONS RÉCENTES :
- Priorisation ARQ : Routage des requêtes utilisateur à la volée vers 
  la file 'high_priority' pour court-circuiter l'ingestion massive ('default').
- Optimisation Quota API : Tri des parties ingérées par date d'apparition 
  pour ne télécharger la timeline (coûteuse en jetons) que pour les 5 
  parties les plus récentes.
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
        self.db = db
        self.client = RiotClient(settings.RIOT_API_KEY)

    @staticmethod
    def _get_match_timestamp_approx(match_id: str) -> int:
        """
        Extrait la partie numérique d'un identifiant Riot (ex: EUW1_6812345678 -> 6812345678)
        utilisée pour trier rapidement les parties de la plus récente à la plus ancienne
        sans avoir besoin d'interroger l'API pour connaître leur date de création exacte.
        """
        try:
            return int(match_id.split('_')[1])
        except (IndexError, ValueError):
            return 0
        
    async def sync_player_profile(self, server: str, game_name: str, tag_line: str) -> Dict[str, Any]:
        """
        Synchronise le profil du joueur et récupère les 20 dernières parties 
        de chaque file majeure. Met à jour les informations de ligue.
        """
        routing = self.client.get_routing(server)
        continent = routing["continent"]
        region = routing["region"]

        # 1. Résolution du PUUID (Account V1)
        account = await self.client.get_account_by_riot_id(continent, game_name, tag_line)
        if not account:
            return {"error": "Joueur introuvable. Vérifiez le pseudo et le tag."}
        puuid = account.get("puuid")

        # 2. Récupération Summoner V4
        summoner_data = await self.client.get_summoner_by_puuid(region, puuid)
        if not summoner_data:
            return {"error": f"Impossible de récupérer le profil sur le serveur {server}."}

        # 3. Récupération de l'Elo
        summoner_id = summoner_data.get("id")
        tier, rank, lp = None, None, None
        
        if summoner_id:
            league_data = await self.client.get_league_entries(region, summoner_id)
            for entry in league_data:
                if entry.get("queueType") == "RANKED_SOLO_5x5":
                    tier = entry.get("tier")
                    rank = entry.get("rank")
                    lp = entry.get("leaguePoints")
                    break

        # 4. Le "Triple Appel Léger" (Conservation de 20 par file pour la vue historique globale)
        api_tasks = [
            self.client.get_match_ids(continent, puuid, queue=420, count=20),
            self.client.get_match_ids(continent, puuid, queue=440, count=20),
            self.client.get_match_ids(continent, puuid, queue=400, count=20)
        ]
        
        lists_of_ids = await asyncio.gather(*api_tasks, return_exceptions=True)
        
        all_fetched_ids = set()
        for l in lists_of_ids:
            if isinstance(l, list):
                all_fetched_ids.update(l)
                
        # 5. Filtre Anti-Doublon SQL
        new_match_ids = []
        if all_fetched_ids:
            query = select(Match.match_id).where(Match.match_id.in_(all_fetched_ids))
            result = await self.db.execute(query)
            existing_ids = set(result.scalars().all())
            new_match_ids = [m_id for m_id in all_fetched_ids if m_id not in existing_ids]

        # 6. Sauvegarde du Profil
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

        # 7. Transmission ARQ Sécurisée avec Optimisation du Quota
        tasks_enqueued = 0
        if new_match_ids:
            # Tri des parties de la plus récente à la plus ancienne
            new_match_ids.sort(key=self._get_match_timestamp_approx, reverse=True)
            
            redis_pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
            for i, m_id in enumerate(new_match_ids):
                # Seules les 5 premières parties bénéficient d'un téléchargement immédiat de la timeline
                fetch_timeline = (i < 5)
                
                # Routage explicite vers la file 'default' pour ne pas bloquer le frontend
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
        Déclenche la récupération de parties anciennes (Deep Fetch).
        """
        routing = self.client.get_routing(server)
        continent = routing["continent"]

        api_tasks = [
            self.client.get_match_ids(continent, puuid, start=start_index, queue=420, count=20),
            self.client.get_match_ids(continent, puuid, start=start_index, queue=440, count=20),
            self.client.get_match_ids(continent, puuid, start=start_index, queue=400, count=20)
        ]
        
        lists_of_ids = await asyncio.gather(*api_tasks, return_exceptions=True)
        
        all_fetched_ids = set()
        for l in lists_of_ids:
            if isinstance(l, list):
                all_fetched_ids.update(l)
                
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
                # Sur du Deep Fetch (historique lointain), on désactive systématiquement 
                # la timeline pour préserver le quota
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
        Déclenche l'ingestion asynchrone des timelines ciblées à la demande du frontend.
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
                # Routage CRITIQUE : ces requêtes initiées par l'action humaine vont 
                # dans la file 'high_priority' pour être traitées instantanément.
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