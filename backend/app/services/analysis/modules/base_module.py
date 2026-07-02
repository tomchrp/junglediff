"""
===============================================================================
FICHIER : backend/app/services/analysis/modules/base_module.py
PROJET  : JungleDiff

DESCRIPTION :
Définit le contrat strict que tout module d'analyse (Combat, Vision, etc.) 
doit respecter. Garantit que l'orchestrateur pourra instancier n'importe 
quelle brique de manière aveugle (Duck Typing).
===============================================================================
"""

from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseMetricModule(ABC):
    
    @abstractmethod
    def compute(self, participant: Dict[str, Any], match_data: Dict[str, Any], timeline_data: Dict[str, Any] = None, opponent: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Analyse les données brutes d'une partie pour en extraire des métriques ciblées.
        
        Paramètres :
        - participant : Dictionnaire des données du joueur ciblé.
        - match_data : Dictionnaire global de la partie (Détails).
        - timeline_data : Dictionnaire des événements temporels (Timeline).
        - opponent : Dictionnaire des données du vis-à-vis (peut être None).
        
        Retourne :
        Un dictionnaire de données prêt à être consommé par le frontend pour un onglet précis.
        """
        pass