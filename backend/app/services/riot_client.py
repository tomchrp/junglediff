import httpx
import asyncio
import logging
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

    # AJOUT DU PARAMÈTRE fail_fast
    async def _request(self, method: str, url: str, fail_fast: bool = False, **kwargs) -> Any:
        lock_key = "riot_api_lock"
        
        async with httpx.AsyncClient(headers=self.headers, timeout=self.timeout) as client:
            while True:
                ttl = await self.redis.ttl(lock_key)
                if ttl > 0:
                    # LE FAIL-FAST EST ICI : Rejet immédiat si c'est une requête Frontend
                    if fail_fast:
                        logger.warning(f"Fail-Fast actif. Rejet immédiat de {url} (TTL: {ttl}s)")
                        raise RateLimitExceeded(ttl)
                        
                    logger.info(f"Verrou distribué actif. Worker en pause pour {ttl}s avant de requêter {url}.")
                    await asyncio.sleep(ttl)
                    continue

                response = await client.request(method, url, **kwargs)
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 1))
                    logger.warning(f"Rate limit Riot atteint sur {url}. Pose du verrou global pour {retry_after}s.")
                    await self.redis.set(lock_key, "locked", ex=retry_after)
                    
                    # LE FAIL-FAST EN CAS DE CHOC DIRECT
                    if fail_fast:
                        raise RateLimitExceeded(retry_after)
                        
                    await asyncio.sleep(retry_after)
                    continue
                elif response.status_code == 403:
                    logger.error("Erreur 403: La clé API Riot est probablement expirée.")
                    raise APIKeyExpired("Clé API Riot expirée ou invalide.")
                elif response.status_code == 404:
                    return None
                else:
                    logger.error(f"Erreur HTTP {response.status_code} sur {url}")
                    response.raise_for_status()

    # --- TRANSMISSION DU fail_fast DANS TOUTES LES MÉTHODES ---

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

    async def get_league_entries(self, region: str, summoner_id: str, fail_fast: bool = False) -> List[Dict[str, Any]]:
        url = f"https://{region}.api.riotgames.com/lol/league/v4/entries/by-summoner/{summoner_id}"
        res = await self._request("GET", url, fail_fast=fail_fast)
        return res if res else []