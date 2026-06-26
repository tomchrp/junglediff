"""
===============================================================================
FICHIER : backend/app/services/riot_client.py
PROJET  : JungleDiff

DESCRIPTION :
Client HTTP asynchrone (httpx) dédié aux interactions avec l'API Riot Games. 
Implémente la méthode flexible get_match_ids pour filtrer nativement les files.
Intègre une protection par verrou distribué (Redis) pour synchroniser le 
Rate Limiting entre tous les workers asynchrones et prévenir le banissement
de la clé API.
===============================================================================
"""

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
        # Initialisation du client Redis pour le verrou distribué
        self.redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)

    @staticmethod
    def get_routing(server_input: str) -> dict:
        return ROUTING_MAP.get(server_input.upper(), ROUTING_MAP["EUW"])

    async def _request(self, method: str, url: str, **kwargs) -> Any:
        """
        Exécute une requête HTTP asynchrone vers l'API Riot avec gestion du Rate Limit distribué.
        
        Fonctionnement :
        1. Avant toute requête HTTP, le client lit une clé dans Redis (riot_api_lock).
        2. Si la clé existe, cela signifie qu'un autre worker a percuté la limite 429.
           Le worker actuel se met en pause localement pendant la durée restante du verrou.
        3. Si une erreur 429 est rencontrée en cours de vol, le worker fautif pose le verrou
           dans Redis pour la durée spécifiée par le header Retry-After de Riot.
        
        Cette mécanique garantit qu'aucun worker ne frappera l'API pendant la période de restriction globale.
        """
        lock_key = "riot_api_lock"
        
        async with httpx.AsyncClient(headers=self.headers, timeout=self.timeout) as client:
            while True:
                # Vérification du verrou distribué avant l'appel réseau
                ttl = await self.redis.ttl(lock_key)
                if ttl > 0:
                    logger.info(f"Verrou distribué actif. Worker en pause pour {ttl}s avant de requêter {url}.")
                    await asyncio.sleep(ttl)
                    continue

                response = await client.request(method, url, **kwargs)
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 1))
                    logger.warning(f"Rate limit Riot atteint sur {url}. Pose du verrou global pour {retry_after}s.")
                    
                    # Pose du verrou dans Redis pour informer tous les autres workers
                    await self.redis.set(lock_key, "locked", ex=retry_after)
                    
                    # Mise en pause du worker actuel
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