"""
===============================================================================
FICHIER : backend/app/services/riot_client.py
PROJET  : JungleDiff

DESCRIPTION :
Client HTTP asynchrone (httpx) dédié aux interactions avec l'API Riot Games. 
Implémente la méthode flexible get_match_ids pour filtrer nativement les files.
===============================================================================
"""

import httpx
import asyncio
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

class RiotAPIError(Exception):
    pass

class RateLimitExceeded(RiotAPIError):
    pass

class APIKeyExpired(RiotAPIError):
    pass

# Table de traduction stricte pour le routage de l'API Riot
ROUTING_MAP = {
    "EUW": {"region": "euw1", "continent": "europe"},
    "NA": {"region": "na1", "continent": "americas"},
    "KR": {"region": "kr", "continent": "asia"},
}

class RiotClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {"X-Riot-Token": self.api_key}
        self.timeout = httpx.Timeout(10.0, connect=5.0)

    @staticmethod
    def get_routing(server_input: str) -> dict:
        return ROUTING_MAP.get(server_input.upper(), ROUTING_MAP["EUW"])

    async def _request(self, method: str, url: str, **kwargs) -> Any:
        async with httpx.AsyncClient(headers=self.headers, timeout=self.timeout) as client:
            while True:
                response = await client.request(method, url, **kwargs)
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 1))
                    logger.warning(f"Rate limit atteint sur {url}. Pause de {retry_after}s.")
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

    # --- ENDPOINTS CONTINENTAUX (Account V1, Match V5) ---

    async def get_account_by_riot_id(self, continent: str, game_name: str, tagline: str) -> Optional[Dict[str, Any]]:
        url = f"https://{continent}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{game_name}/{tagline}"
        return await self._request("GET", url)

    async def get_match_ids(self, continent: str, puuid: str, start: int = 0, count: int = 20, queue: Optional[int] = None, start_time: Optional[int] = None) -> list:
        """Route unifiée et paramétrable pour le Triple Appel Léger."""
        url = f"https://{continent}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids"
        params = {"start": start, "count": count}
        if queue is not None:
            params["queue"] = queue
        if start_time is not None:
            params["startTime"] = start_time
        return await self._request("GET", url, params=params)

    async def get_match_details(self, continent: str, match_id: str) -> Optional[Dict[str, Any]]:
        url = f"https://{continent}.api.riotgames.com/lol/match/v5/matches/{match_id}"
        return await self._request("GET", url)

    async def get_match_timeline(self, continent: str, match_id: str) -> Optional[Dict[str, Any]]:
        url = f"https://{continent}.api.riotgames.com/lol/match/v5/matches/{match_id}/timeline"
        return await self._request("GET", url)

    # --- ENDPOINTS RÉGIONAUX (Summoner V4, League V4) ---

    async def get_summoner_by_puuid(self, region: str, puuid: str) -> Optional[Dict[str, Any]]:
        url = f"https://{region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{puuid}"
        return await self._request("GET", url)

    async def get_league_entries(self, region: str, summoner_id: str) -> List[Dict[str, Any]]:
        url = f"https://{region}.api.riotgames.com/lol/league/v4/entries/by-summoner/{summoner_id}"
        res = await self._request("GET", url)
        return res if res else []