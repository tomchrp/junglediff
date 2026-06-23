"""
===============================================================================
FICHIER : backend/app/services/riot_client.py
PROJET  : JungleDiff

DESCRIPTION :
Client HTTP asynchrone dédié aux interactions avec l'API Riot Games. 
Il abstrait la complexité du routage géographique (régional vs continental) 
et implémente un système de résilience robuste : interception des erreurs 429 
(Rate Limit) avec mise en pause asynchrone automatique, et détection des 
erreurs 403 (Clé expirée).
===============================================================================
"""

import httpx
import asyncio
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class RiotAPIError(Exception):
    """Exception de base pour les erreurs liées à l'API Riot."""
    pass

class RateLimitExceeded(RiotAPIError):
    """Levée quand le rate limit est atteint, bien que le client tente de l'éviter."""
    pass

class APIKeyExpired(RiotAPIError):
    """Levée quand l'API renvoie un 403 (Forbidden), signalant souvent une clé expirée."""
    pass

class RiotClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "X-Riot-Token": self.api_key
        }
        self.timeout = httpx.Timeout(10.0, connect=5.0)

    async def _request(self, method: str, url: str, **kwargs) -> Dict[str, Any]:
        """
        Exécute la requête HTTP asynchrone avec gestion native du Rate Limiting.
        
        Cette fonction complexe est le filet de sécurité du backend. Elle envoie
        la requête à Riot. Si une erreur 429 est détectée, elle lit le header
        'Retry-After' pour connaître la durée exacte de la pénalité, met en pause
        l'exécution (asyncio.sleep) de la tâche courante pour cette durée précise,
        puis retente la requête automatiquement. Si un 403 est reçu, elle bloque
        l'exécution et lève une erreur critique.
        
        Args:
            method: Verbe HTTP ('GET', etc.)
            url: URL complète de l'endpoint Riot
            **kwargs: Arguments supplémentaires passés à httpx
            
        Returns:
            Dict: Le payload JSON parsé de la réponse de Riot.
            
        Raises:
            APIKeyExpired: Si la clé est invalide ou expirée.
            RiotAPIError: Pour tout autre code d'erreur non géré.
        """
        async with httpx.AsyncClient(headers=self.headers, timeout=self.timeout) as client:
            while True:
                response = await client.request(method, url, **kwargs)
                
                # Succès
                if response.status_code == 200:
                    return response.json()
                
                # Gestion du Rate Limiting (429)
                elif response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 1))
                    logger.warning(f"Rate limit atteint sur {url}. Pause de {retry_after} secondes.")
                    await asyncio.sleep(retry_after)
                    continue # Retente la boucle après la pause
                
                # Gestion de la clé expirée (403)
                elif response.status_code == 403:
                    logger.error("Erreur 403: La clé API Riot est probablement expirée.")
                    raise APIKeyExpired("La clé API Riot a expiré ou n'a pas les droits.")
                
                # Erreur 404
                elif response.status_code == 404:
                    logger.info(f"Ressource non trouvée: {url}")
                    return None
                
                # Autres erreurs
                else:
                    error_msg = f"Erreur API Riot {response.status_code} sur {url}: {response.text}"
                    logger.error(error_msg)
                    response.raise_for_status()

    async def get_account_by_riot_id(self, continent: str, game_name: str, tagline: str) -> Optional[Dict[str, Any]]:
        """
        Récupère le PUUID d'un joueur à partir de son Riot ID.
        Utilise le routage continental (ex: 'europe', 'americas').
        """
        url = f"https://{continent}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{game_name}/{tagline}"
        return await self._request("GET", url)

    async def get_match_ids_by_puuid(self, continent: str, puuid: str, queue_type: int = None, start: int = 0, count: int = 100) -> list:
        """
        Récupère la liste des Match IDs pour un joueur donné.
        Filtre optionnellement par queue_type (ex: 420 pour Solo/Duo).
        """
        url = f"https://{continent}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids"
        params = {"start": start, "count": count}
        if queue_type:
            params["queue"] = queue_type
            
        return await self._request("GET", url, params=params)

    async def get_match_details(self, continent: str, match_id: str) -> Optional[Dict[str, Any]]:
        """
        Récupère le payload JSON complet des détails d'une partie.
        Le match_id contient déjà la région (ex: 'EUW1_12345678').
        """
        url = f"https://{continent}.api.riotgames.com/lol/match/v5/matches/{match_id}"
        return await self._request("GET", url)

    async def get_match_timeline(self, continent: str, match_id: str) -> Optional[Dict[str, Any]]:
        """
        Récupère le payload JSON complet de la timeline d'une partie.
        """
        url = f"https://{continent}.api.riotgames.com/lol/match/v5/matches/{match_id}/timeline"
        return await self._request("GET", url)