"""
===============================================================================
FICHIER : backend/app/services/analysis/orchestrator.py
PROJET  : JungleDiff

DESCRIPTION :
Point d'entrée unique de l'analyse métier post-ingestion.
Éradique l'ancienne logique conditionnelle monolithique. 
Interroge le registre, itère sur les modules assignés à l'archétype, 
et agrège leurs retours dans un dictionnaire JSON standardisé pour le frontend.
Cette version garantit que les clés des onglets sont placées à la racine de 
la réponse pour respecter le contrat de données de l'interface utilisateur.
===============================================================================
"""

import json
import os
from typing import Dict, Any
from app.services.analysis.registry import ANALYSIS_REGISTRY

class AnalysisOrchestrator:

    def __init__(self):
        self.archetypes = self._load_archetypes()

    def _load_archetypes(self) -> Dict[str, str]:
        """
        Charge le dictionnaire statique associant l'ID Riot d'un champion 
        à son Archétype de gameplay (ex: 11 -> ASSASSIN).
        
        Retourne :
        Un dictionnaire { "champion_id_str": "ARCHETYPE" }.
        """
        file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "core", "dictionaries", "archetypes.json")
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            return {}

    def _calculate_support_radar(self, participant: Dict[str, Any]) -> list:
        """
        Génère les données mathématiques normalisées (base 100) pour le 
        composant graphique Radar exclusif au rôle Support.
        
        Paramètres :
        - participant : Dictionnaire des données du joueur.
        
        Retourne :
        Une liste de dictionnaires contenant les scores par axe pour le joueur et l'adversaire.
        """
        c = participant.get("challenges", {})
        vision_per_min = c.get("visionScorePerMinute", 0)
        vision_score_normalized = min(100, int((vision_per_min / 3.5) * 100)) if vision_per_min else 0
        deaths = participant.get("deaths", 0)
        survival_score = 100 if deaths == 0 else max(0, 100 - (deaths * 10))
        kp = c.get("killParticipation", 0)
        
        return [
            {"axe": "Vision", "scoreJoueur": vision_score_normalized, "scoreAdversaire": 50},
            {"axe": "Presence", "scoreJoueur": int(kp * 100), "scoreAdversaire": 50},
            {"axe": "Survie", "scoreJoueur": survival_score, "scoreAdversaire": 50},
            {"axe": "Utilitaire", "scoreJoueur": 80, "scoreAdversaire": 75},
            {"axe": "Pression", "scoreJoueur": 55, "scoreAdversaire": 85}
        ]

    def analyze_match(self, role: str, participant: Dict[str, Any], match_data: Dict[str, Any], timeline_data: Dict[str, Any] = None, opponent: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Orchestre la création de la vue experte d'une carte de match en appliquant
        le pattern de Composition. Instancie les modules d'analyse requis par 
        le registre et fusionne leurs résultats.
        
        Paramètres :
        - role : Le rôle joué (ex: SUPPORT, JUNGLE).
        - participant, match_data, timeline_data, opponent : Données brutes Riot.
        
        Retourne :
        Un dictionnaire plat contenant les métadonnées et les données de chaque onglet à la racine.
        """
        champion_id = str(participant.get("championId"))
        archetype = self.archetypes.get(champion_id, "NON DEFINI")
        
        opponent_archetype = None
        if opponent:
            opp_champ_id = str(opponent.get("championId"))
            opponent_archetype = self.archetypes.get(opp_champ_id, "NON DEFINI")

        role_upper = role.upper()
        
        # Récupération de la liste de modules via le Registre
        modules_config = ANALYSIS_REGISTRY.get(role_upper, {}).get(archetype, {})

        # Construction de la base de la réponse
        response = {
            "metadata": {
                "role": role_upper,
                "archetype": archetype,
                "opponentArchetype": opponent_archetype
            },
            "radar_data": self._calculate_support_radar(participant) if role_upper == "SUPPORT" else [],
            "insights": []
        }

        # Injection des onglets directement à la racine pour respecter le frontend
        for tab_name, module in modules_config.items():
            response[tab_name] = module.compute(participant, match_data, timeline_data, opponent)

        return response