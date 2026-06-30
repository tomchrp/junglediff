"""
===============================================================================
FICHIER : backend/app/services/analysis/base_analyzer.py
PROJET  : JungleDiff

DESCRIPTION :
Définit l'interface de base pour tous les analyseurs de rôle.
La signature a été mise à jour pour inclure les données de la timeline, 
nécessaires à la construction des graphes temporels et des proxies avancés.
===============================================================================
"""

from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseRoleAnalyzer(ABC):
    
    @abstractmethod
    def analyze(self, participant: Dict[str, Any], match_data: Dict[str, Any], timeline_data: Dict[str, Any] = None, opponent: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Analyse les performances d'un joueur pour une partie donnée.
        
        Args:
            participant: Statistiques brutes du joueur ciblé.
            match_data: Données globales de la partie.
            timeline_data: Données temporelles (frames et événements).
            opponent: Statistiques brutes du vis-à-vis.
            
        Returns:
            Dict: Contrat de données standardisé.
        """
        pass