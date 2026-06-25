"""
===============================================================================
FICHIER : backend/app/services/sync_service.py
PROJET  : JungleDiff

DESCRIPTION :
Cœur de la logique métier pour l'ingestion différentielle. 
Implémente le "Triple Appel Léger" (SoloQ, Flex, Draft) et le filtre 
anti-doublon SQL pour protéger les quotas de l'API Riot.
===============================================================================
"""

import time
import asyncio
from typing import Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from arq import create_pool
from arq.connections import RedisSettings

from app.core.config import settings
from app.db.models import Player, Match, MatchTimeline, MatchParticipant  # <-- Ajout de Match et MatchTimeline pour le filtrage
from app.services.riot_client import RiotClient

class SyncService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = RiotClient(settings.RIOT_API_KEY)
        
    async def sync_player_profile(self, server: str, game_name: str, tag_line: str) -> Dict[str, Any]:
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

        # 4. Le "Triple Appel Léger" (Filtrage natif par file)
        # On demande 20 parties par file compétitive majeure (Coût: 3 requêtes)
        api_tasks = [
            self.client.get_match_ids(continent, puuid, queue=420, count=20), # Solo/Duo
            self.client.get_match_ids(continent, puuid, queue=440, count=20), # Flex
            self.client.get_match_ids(continent, puuid, queue=400, count=20)  # Draft
        ]
        
        # Exécution parallèle pour ne pas ralentir le backend
        lists_of_ids = await asyncio.gather(*api_tasks, return_exceptions=True)
        
        # Aplatissement et déduplication des IDs bruts
        all_fetched_ids = set()
        for l in lists_of_ids:
            if isinstance(l, list):
                all_fetched_ids.update(l)
                
        # 5. Le Filtre Anti-Doublon (Diff avec la base de données)
        new_match_ids = []
        if all_fetched_ids:
            query = select(Match.match_id).where(Match.match_id.in_(all_fetched_ids))
            result = await self.db.execute(query)
            existing_ids = set(result.scalars().all())
            
            # On ne conserve que les IDs qui ne sont pas en base
            new_match_ids = [m_id for m_id in all_fetched_ids if m_id not in existing_ids]

        # 6. Sauvegarde du Profil (UPSERT)
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

        # 7. Transmission des Tâches Qualifiées aux Workers
        tasks_enqueued = 0
        if new_match_ids:
            redis_pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
            for m_id in new_match_ids:
                # Le Worker ne recevra plus JAMAIS d'ARAM ni de matchs déjà ingérés
                await redis_pool.enqueue_job('process_match_ingestion', m_id, continent)
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
    
    async def trigger_timeline_prefetch(self, match_id: str, puuid: str, server: str) -> dict:
        """
        Déclenche l'ingestion P0 pour le match ciblé, et P1 pour ses voisins spatiaux.
        """
        routing = self.client.get_routing(server)
        continent = routing["continent"]

        # 1. Récupérer l'historique chronologique du joueur pour trouver les adjacents
        query = (
            select(Match.match_id)
            .join(Match.participants)
            .where(MatchParticipant.puuid == puuid)
            .order_by(Match.creation_timestamp.desc())
        )
        result = await self.db.execute(query)
        ordered_match_ids = result.scalars().all()

        targets_to_fetch = [match_id] # P0 en premier

        # 2. Identification de N-1 et N+1 (Localité spatiale)
        try:
            index = ordered_match_ids.index(match_id)
            if index > 0:
                targets_to_fetch.append(ordered_match_ids[index - 1]) # Match plus récent (N+1 visuel)
            if index < len(ordered_match_ids) - 1:
                targets_to_fetch.append(ordered_match_ids[index + 1]) # Match plus ancien (N-1 visuel)
        except ValueError:
            pass # Le match_id n'est pas dans la liste (cas rare)

        # 3. Vérifier quelles timelines manquent réellement en base
        query_missing = select(MatchTimeline.match_id).where(MatchTimeline.match_id.in_(targets_to_fetch))
        result_missing = await self.db.execute(query_missing)
        existing_timelines = set(result_missing.scalars().all())

        missing_targets = [m_id for m_id in targets_to_fetch if m_id not in existing_timelines]

        # 4. Envoi au Worker
        tasks_enqueued = 0
        if missing_targets:
            redis_pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
            
            for m_id in missing_targets:
                # Le premier élément de missing_targets est le match_id cliqué (P0)
                # arq permet de définir un _defer_by, mais ici l'ordre d'insertion dicte la priorité immédiate
                await redis_pool.enqueue_job('process_timeline_only', m_id, continent)
                tasks_enqueued += 1
                
            await redis_pool.aclose()

        return {
            "status": "triggered",
            "enqueued": tasks_enqueued,
            "targets": missing_targets
        }