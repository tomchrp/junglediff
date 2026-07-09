"""
===============================================================================
FICHIER : backend/app/services/riot_client.py
PROJET  : JungleDiff

DESCRIPTION :
Client HTTP asynchrone pour l'interaction avec l'API Riot Games.
Gère les requêtes, le routage continental/régional, et intègre un système
de Rate Limit distribué via Redis pour prévenir les erreurs 429 et les bannissements.

MODIFICATIONS (PHASE 2 - OPTIMISATION BIG DATA) :
- Remplacement du décodeur JSON natif par orjson (Rust) sur les flux d'octets
  pour accélérer drastiquement le traitement des payloads massifs (Timelines).
- Ajout de la méthode get_league_entries_by_division (League-V4) pour le snowball.
- Ajout de la méthode get_summoner_by_id (Summoner-V4) pour la traduction d'identifiants.
===============================================================================
"""

import httpx
import asyncio
import logging
import orjson
from typing import Dict, Any, Optional, List
from redis.asyncio import Redis

from app.core.config import settings

logger = logging.getLogger(__name__)

class RiotAPIError(Exception):
    pass

class RateLimitExceeded(RiotAPIError):
    def __init__(self, ttl: int):
        self.ttl = ttl
        super().__init__(f"Rate limit Riot atteint. Réessayez dans {ttl}s.")

class APIKeyExpired(RiotAPIError):
    pass

ROUTING_MAP = {
    "EUW": {"region": "euw1", "continent": "europe"},
    "NA": {"region": "na1", "continent": "americas"},
    "KR": {"region": "kr", "continent": "asia"},
}

class RiotClient:
    # CLÉ DE VOÛTE : Connexion Redis partagée pour éviter l'épuisement (Connection Leak)
    _redis_client = None

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {"X-Riot-Token": self.api_key}
        self.timeout = httpx.Timeout(10.0, connect=5.0)
        
        # On n'instancie Redis qu'une seule fois pour toute la durée de vie du serveur
        if RiotClient._redis_client is None:
            RiotClient._redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
        self.redis = RiotClient._redis_client

    @staticmethod
    def get_routing(server_input: str) -> dict:
        return ROUTING_MAP.get(server_input.upper(), ROUTING_MAP["EUW"])

    async def _request(self, method: str, url: str, fail_fast: bool = False, **kwargs) -> Any:
        """
        Exécute une requête HTTP asynchrone avec gestion distribuée du Rate Limit.
        
        Logique :
        1. Vérifie la présence d'un verrou dans Redis.
        2. Si un verrou existe, attend (ou échoue immédiatement si fail_fast=True).
        3. Exécute la requête.
        4. Intercepte les 429, pose un verrou global, et retente (ou échoue).
        5. Utilise orjson pour désérialiser la réponse binaire en dictionnaire Python.
        """
        lock_key = "riot_api_lock"
        
        async with httpx.AsyncClient(headers=self.headers, timeout=self.timeout) as client:
            while True:
                ttl = await self.redis.ttl(lock_key)
                if ttl > 0:
                    if fail_fast:
                        logger.warning(f"Fail-Fast actif. Rejet immédiat de {url} (TTL: {ttl}s)")
                        raise RateLimitExceeded(ttl)
                        
                    logger.info(f"Verrou distribué actif. Worker en pause pour {ttl}s avant de requêter {url}.")
                    await asyncio.sleep(ttl)
                    continue

                response = await client.request(method, url, **kwargs)
                
                if response.status_code == 200:
                    # OPTIMISATION CRITIQUE : orjson ingère directement les bytes (response.content)
                    return orjson.loads(response.content)
                elif response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 1))
                    logger.warning(f"Rate limit Riot atteint sur {url}. Pose du verrou global pour {retry_after}s.")
                    await self.redis.set(lock_key, "locked", ex=retry_after)
                    
                    if fail_fast:
                        raise RateLimitExceeded(retry_after)
                        
                    await asyncio.sleep(retry_after)
                    continue
                elif response.status_code in (401, 403):
                    logger.error(f"Erreur {response.status_code}: La clé API Riot est expirée ou invalide.")
                    raise APIKeyExpired("Clé API Riot expirée ou invalide. Veuillez la renouveler.")
                elif response.status_code == 404:
                    return None
                else:
                    logger.error(f"Erreur HTTP {response.status_code} sur {url}")
                    response.raise_for_status()

    async def get_account_by_riot_id(self, continent: str, game_name: str, tagline: str, fail_fast: bool = False) -> Optional[Dict[str, Any]]:
        url = f"https://{continent}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{game_name}/{tagline}"
        return await self._request("GET", url, fail_fast=fail_fast)

    async def get_match_ids(self, continent: str, puuid: str, start: int = 0, count: int = 20, queue: Optional[int] = None, start_time: Optional[int] = None, fail_fast: bool = False) -> list:
        url = f"https://{continent}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids"
        params = {"start": start, "count": count}
        if queue is not None: params["queue"] = queue
        if start_time is not None: params["startTime"] = start_time
        return await self._request("GET", url, fail_fast=fail_fast, params=params)

    async def get_match_details(self, continent: str, match_id: str, fail_fast: bool = False) -> Optional[Dict[str, Any]]:
        url = f"https://{continent}.api.riotgames.com/lol/match/v5/matches/{match_id}"
        return await self._request("GET", url, fail_fast=fail_fast)

    async def get_match_timeline(self, continent: str, match_id: str, fail_fast: bool = False) -> Optional[Dict[str, Any]]:
        url = f"https://{continent}.api.riotgames.com/lol/match/v5/matches/{match_id}/timeline"
        return await self._request("GET", url, fail_fast=fail_fast)

    async def get_summoner_by_puuid(self, region: str, puuid: str, fail_fast: bool = False) -> Optional[Dict[str, Any]]:
        url = f"https://{region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{puuid}"
        return await self._request("GET", url, fail_fast=fail_fast)

    async def get_league_entries_by_summoner(self, region: str, summoner_id: str, fail_fast: bool = False) -> List[Dict[str, Any]]:
        url = f"https://{region}.api.riotgames.com/lol/league/v4/entries/by-summoner/{summoner_id}"
        res = await self._request("GET", url, fail_fast=fail_fast)
        return res if res else []

    async def get_league_entries_by_division(self, region: str, queue: str, tier: str, division: str = "I", page: int = 1, fail_fast: bool = False) -> list:
        tier_upper = tier.upper()
        
        if tier_upper in ["MASTER", "GRANDMASTER", "CHALLENGER"]:
            url = f"https://{region}.api.riotgames.com/lol/league/v4/{tier_upper.lower()}leagues/by-queue/{queue}"
            res = await self._request("GET", url, fail_fast=fail_fast)
            if not res or "entries" not in res:
                return []
            
            # DEBUG : Affichons ce qu'on reçoit pour être sûr du format
            entries = res.get("entries", [])
            # Nettoyage : On normalise le dictionnaire pour que le Crawler n'ait pas à gérer les variations de clés
            normalized = []
            for e in entries:
                # Riot peut renvoyer 'summonerId' ou 'summoner_id'
                s_id = e.get("summonerId") or e.get("summoner_id")
                if s_id:
                    normalized.append({"summonerId": s_id})
            return normalized
            
        else:
            url = f"https://{region}.api.riotgames.com/lol/league/v4/entries/{queue}/{tier_upper}/{division}?page={page}"
            res = await self._request("GET", url, fail_fast=fail_fast)
            return res if res else []

    async def get_summoner_by_id(self, region: str, summoner_id: str, fail_fast: bool = False) -> Optional[Dict[str, Any]]:
        """
        Traduit un SummonerId (Legacy) en profil complet incluant le PUUID (Match-V5).
        Nécessaire comme pont entre les classements de League-V4 et l'historique de matchs.
        """
        url = f"https://{region}.api.riotgames.com/lol/summoner/v4/summoners/{summoner_id}"
        return await self._request("GET", url, fail_fast=fail_fast)