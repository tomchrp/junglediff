"""
===============================================================================
FICHIER : backend/app/services/analysis/modules/combat/vanguard_combat.py
PROJET  : JungleDiff

DESCRIPTION :
Module expert gérant l'extraction des statistiques de combat pour l'archétype 
VANGUARD (Support d'engagement). Isole la logique de mitigation des dégâts, 
de survie et d'application de contrôles de foule. Hérite de BaseRoleAnalyzer 
pour accéder aux méthodes utilitaires de parcours temporel.
===============================================================================
"""

from typing import Dict, Any
from app.services.analysis.base_analyzer import BaseRoleAnalyzer

class VanguardCombatModule(BaseRoleAnalyzer):

    def analyze(self, participant: Dict[str, Any], match_data: Dict[str, Any], timeline_data: Dict[str, Any] = None, opponent: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Implémentation factice pour satisfaire le contrat de la classe parente abstraite BaseRoleAnalyzer.
        L'Orchestrateur n'appellera jamais cette méthode, il utilisera `compute()`.
        """
        pass

    def compute(self, participant: Dict[str, Any], match_data: Dict[str, Any], timeline_data: Dict[str, Any] = None, opponent: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Agrège les métriques défensives et génère le graphe temporel d'encaissement.
        
        Logique métier :
        Utilise une fonction lambda injectée dans le moteur de timeline parent 
        pour extraire spécifiquement la valeur 'totalDamageTaken' à chaque frame.
        """
        c = participant.get("challenges", {})
        o_c = opponent.get("challenges", {}) if opponent else {}
        
        extract_tank_fn = lambda p: {"totalDamage": p.get("damageStats", {}).get("totalDamageTaken", 0)}
        timeline_combat = self._extract_timeline_data(participant.get("participantId"), timeline_data, extract_tank_fn)
        
        return {
            "archetype": "VANGUARD",
            "damageSelfMitigated": participant.get("damageSelfMitigated", 0),
            "damageSelfMitigatedOpponent": opponent.get("damageSelfMitigated", 0) if opponent else 0,
            "totalDamageTaken": participant.get("totalDamageTaken", 0),
            "totalDamageTakenOpponent": opponent.get("totalDamageTaken", 0) if opponent else 0,
            "damageTakenOnTeamPercentage": c.get("damageTakenOnTeamPercentage", 0),
            "damageTakenOnTeamPercentageOpponent": o_c.get("damageTakenOnTeamPercentage", 0) if opponent else 0,
            "killParticipation": c.get("killParticipation", 0),
            "killParticipationOpponent": o_c.get("killParticipation", 0) if opponent else 0,
            "timeCCingOthers": participant.get("timeCCingOthers", 0),
            "timeCCingOthersOpponent": opponent.get("timeCCingOthers", 0) if opponent else 0,
            "enemyChampionImmobilizations": c.get("enemyChampionImmobilizations", 0),
            "enemyChampionImmobilizationsOpponent": o_c.get("enemyChampionImmobilizations", 0) if opponent else 0,
            "immobilizeAndKillWithAlly": c.get("immobilizeAndKillWithAlly", 0),
            "immobilizeAndKillWithAllyOpponent": o_c.get("immobilizeAndKillWithAlly", 0) if opponent else 0,
            "tookLargeDamageSurvived": c.get("tookLargeDamageSurvived", 0),
            "tookLargeDamageSurvivedOpponent": o_c.get("tookLargeDamageSurvived", 0) if opponent else 0,
            "timelineGraph": timeline_combat
        }