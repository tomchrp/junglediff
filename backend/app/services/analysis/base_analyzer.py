"""
===============================================================================
FICHIER : backend/app/services/analysis/base_analyzer.py
PROJET  : JungleDiff

DESCRIPTION :
Classe abstraite parente pour tous les analyseurs de rôles.
Fournit le contrat d'interface 'analyze' et centralise les méthodes utilitaires
lourdes (requêtes Data Dragon, parcours des frames de la timeline).
===============================================================================
"""

import json
import urllib.request
from abc import ABC, abstractmethod
from typing import Dict, Any, Callable, Set

class BaseRoleAnalyzer(ABC):
    
    # Cache partagé en mémoire au niveau de la classe parente
    _ddragon_items: Set[int] = None

    @classmethod
    def _get_valid_items(cls) -> Set[int]:
        """
        Récupère dynamiquement les objets depuis Data Dragon.
        Filtre et ne conserve que les objets dits "Majeurs" (Légendaires/Mythiques 
        qui coûtent cher, ou les Bottes T2) pour ne pas polluer les graphiques.
        Met le résultat en cache dans la classe lors du premier appel pour 
        optimiser les performances de tous les analyseurs enfants.
        """
        if cls._ddragon_items is not None:
            return cls._ddragon_items
            
        try:
            req_versions = urllib.request.Request("https://ddragon.leagueoflegends.com/api/versions.json", headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req_versions) as response:
                versions = json.loads(response.read().decode())
                latest_version = versions[0]
            
            req_items = urllib.request.Request(f"https://ddragon.leagueoflegends.com/cdn/{latest_version}/data/fr_FR/item.json", headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req_items) as response:
                items_data = json.loads(response.read().decode())['data']
                
            valid_items = set()
            for item_id, item_info in items_data.items():
                gold = item_info.get("gold", {}).get("total", 0)
                tags = item_info.get("tags", [])
                depth = item_info.get("depth", 1)
                
                is_expensive = gold >= 2000
                is_tier2_boots = ("Boots" in tags) and (depth >= 2)
                
                if is_expensive or is_tier2_boots:
                    valid_items.add(int(item_id))
                    
            cls._ddragon_items = valid_items
            return cls._ddragon_items
            
        except Exception as e:
            print(f"[ERREUR] Impossible de charger Data Dragon dans BaseRoleAnalyzer : {e}")
            return set()

    def _extract_timeline_data(self, participant_id: int, timeline_data: Dict[str, Any], extract_fn: Callable[[Dict[str, Any]], Dict[str, Any]]) -> Dict[str, Any]:
        """
        Moteur générique de traitement de la timeline.
        Parcourt les frames, extrait les achats d'objets majeurs, et applique une 
        fonction d'extraction métier pour récupérer les statistiques désirées.
        
        Args:
            participant_id: L'identifiant Riot du joueur dans la partie.
            timeline_data: Le payload brut de la timeline Riot.
            extract_fn: Une fonction (lambda) qui prend les données du participant 
                        d'une frame et retourne un dictionnaire des statistiques à tracer.
                        
        Returns:
            Dict: Payload standardisé sous la clé "damage_graph" pour le front.
        """
        if not timeline_data or "info" not in timeline_data:
            return {"damage_graph": []}

        frames = timeline_data["info"].get("frames", [])
        events = []
        for frame in frames:
            events.extend(frame.get("events", []))
            
        valid_legendary_items = self._get_valid_items()
        
        # Mapping des achats majeurs par minute
        items_per_minute = {}
        for event in events:
            if event.get("type") == "ITEM_PURCHASED" and event.get("participantId") == participant_id:
                item_id = event.get("itemId")
                if item_id in valid_legendary_items:
                    minute = int(event.get("timestamp", 0) // 60000)
                    if minute not in items_per_minute:
                        items_per_minute[minute] = []
                    items_per_minute[minute].append(item_id)

        # Construction du graphe
        damage_graph = []
        for frame in frames:
            ts = frame.get("timestamp", 0)
            minute = int(ts // 60000)
            
            p_frames = frame.get("participantFrames", {})
            p_data = p_frames.get(str(participant_id), {})
            
            # INJECTION DE DÉPENDANCE : L'enfant dicte quelle donnée extraire
            extracted_stats = extract_fn(p_data)
            
            item_ids = items_per_minute.pop(minute, [])
            
            point = {
                "timestamp": ts,
                "itemIds": item_ids
            }
            # Fusion des statistiques demandées avec le point de base
            point.update(extracted_stats)
            damage_graph.append(point)
            
        return {"damage_graph": damage_graph}

    @abstractmethod
    def analyze(self, participant: Dict[str, Any], match_data: Dict[str, Any], timeline_data: Dict[str, Any] = None, opponent: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Contrat strict d'analyse des performances d'un joueur pour une partie donnée.
        """
        pass