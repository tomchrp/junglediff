"""
===============================================================================
FICHIER : backend/app/services/analysis/modules/combat/artillery_combat.py
PROJET  : JungleDiff

DESCRIPTION :
Module expert gérant l'extraction des statistiques de combat pour l'archétype 
ARTILLERY (Support Poke). Isole la logique de pression offensive, de précision 
des skillshots et de survie à distance. Hérite de BaseRoleAnalyzer.
===============================================================================
"""

from typing import Dict, Any
from app.services.analysis.base_analyzer import BaseRoleAnalyzer

class ArtilleryCombatModule(BaseRoleAnalyzer):

    def analyze(self, participant: Dict[str, Any], match_data: Dict[str, Any], timeline_data: Dict[str, Any] = None, opponent: Dict[str, Any] = None) -> Dict[str, Any]:
        pass

    def compute(self, participant: Dict[str, Any], match_data: Dict[str, Any], timeline_data: Dict[str, Any] = None, opponent: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Agrège les métriques offensives et génère le graphe temporel de dégâts.
        
        Logique métier :
        Utilise une fonction lambda injectée dans le moteur de timeline parent 
        pour extraire spécifiquement la valeur 'totalDamageDoneToChampions'.
        """
        c = participant.get("challenges", {})
        o_c = opponent.get("challenges", {}) if opponent else {}
        
        extract_damage_fn = lambda p: {"totalDamage": p.get("damageStats", {}).get("totalDamageDoneToChampions", 0)}
        timeline_combat = self._extract_timeline_data(participant.get("participantId"), timeline_data, extract_damage_fn)
        
        return {
            "damageToChampions": participant.get("totalDamageDealtToChampions", 0),
            "damageToChampionsOpponent": opponent.get("totalDamageDealtToChampions", 0) if opponent else 0,
            "damagePerMinute": c.get("damagePerMinute", 0),
            "damagePerMinuteOpponent": o_c.get("damagePerMinute", 0) if opponent else 0,
            "teamDamagePercentage": c.get("teamDamagePercentage", 0),
            "teamDamagePercentageOpponent": o_c.get("teamDamagePercentage", 0) if opponent else 0,
            "killParticipation": c.get("killParticipation", 0),
            "killParticipationOpponent": o_c.get("killParticipation", 0) if opponent else 0,
            "landSkillShotsEarlyGame": c.get("landSkillShotsEarlyGame", 0),
            "landSkillShotsEarlyGameOpponent": o_c.get("landSkillShotsEarlyGame", 0) if opponent else 0,
            "skillshotsHit": c.get("skillshotsHit", 0),
            "skillshotsHitOpponent": o_c.get("skillshotsHit", 0) if opponent else 0,
            "skillshotsDodged": c.get("skillshotsDodged", 0),
            "skillshotsDodgedOpponent": o_c.get("skillshotsDodged", 0) if opponent else 0,
            "magicDamageDealtToChampions": participant.get("magicDamageDealtToChampions", 0),
            "magicDamageDealtToChampionsOpponent": opponent.get("magicDamageDealtToChampions", 0) if opponent else 0,
            "longestTimeSpentLiving": participant.get("longestTimeSpentLiving", 0),
            "longestTimeSpentLivingOpponent": opponent.get("longestTimeSpentLiving", 0) if opponent else 0,
            "timelineGraph": timeline_combat
        }