"""
===============================================================================
FICHIER : backend/app/services/analysis/modules/pathing/jungle_pathing.py
PROJET  : JungleDiff

DESCRIPTION :
Module d'analyse obéissant au pattern Composition (BaseMetricModule).
Ce module est spécialisé dans l'extraction des données spatiales du early game
pour le rôle de Jungler. Il récupère les coordonnées injectées en base par le 
Trimmer et les structure pour le composant visuel Frontend (JunglePathingMap).

MODIFICATIONS :
- Création du module pour supporter la nouvelle fonctionnalité "First Clear".
===============================================================================
"""

from typing import Dict, Any
from app.services.analysis.modules.base_module import BaseMetricModule

class JunglePathingModule(BaseMetricModule):
    
    def compute(self, participant_data: Dict[str, Any], match_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Méthode publique d'entrée appelée par l'Orchestrateur (Duck Typing).
        """
        return self._extract_pathing_coordinates(participant_data)

    def _extract_pathing_coordinates(self, participant_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extrait les coordonnées et l'équipe (100 = Blue, 200 = Red).
        Génère une structure imbriquée claire sous la clé 'earlyPathing' pour
        éviter de polluer la racine du dictionnaire JSON final.
        """
        return {
            "earlyPathing": {
                "teamId": participant_data.get("team_id"),
                "f1": {
                    "x": participant_data.get("pos_f1_x"),
                    "y": participant_data.get("pos_f1_y")
                },
                "f2": {
                    "x": participant_data.get("pos_f2_x"),
                    "y": participant_data.get("pos_f2_y")
                },
                "f3": {
                    "x": participant_data.get("pos_f3_x"),
                    "y": participant_data.get("pos_f3_y")
                }
            }
        }