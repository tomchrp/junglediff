"""
===============================================================================
FICHIER : backend/app/services/analysis/modules/combat/assassin_combat.py
PROJET  : JungleDiff

DESCRIPTION :
Module expert gérant l'extraction des statistiques de combat pour l'archétype 
ASSASSIN (Généralement Jungle). Focus sur les éliminations ciblées et les ganks.
Ne requiert pas la timeline pour le moment.
===============================================================================
"""

from typing import Dict, Any

class AssassinCombatModule:

    def compute(self, participant: Dict[str, Any], match_data: Dict[str, Any], timeline_data: Dict[str, Any] = None, opponent: Dict[str, Any] = None) -> Dict[str, Any]:
        """Retourne le dictionnaire strict des métriques de combat Assassin."""
        c = participant.get("challenges", {})
        o_c = opponent.get("challenges", {}) if opponent else {}
        
        return {
            "damageToChampions": participant.get("totalDamageDealtToChampions", 0),
            "damageToChampionsOpponent": opponent.get("totalDamageDealtToChampions", 0) if opponent else 0,
            "damagePerMinute": c.get("damagePerMinute", 0),
            "damagePerMinuteOpponent": o_c.get("damagePerMinute", 0) if opponent else 0,
            "killParticipation": c.get("killParticipation", 0),
            "killParticipationOpponent": o_c.get("killParticipation", 0) if opponent else 0,
            "earlyGanks": c.get("killsOnLanersEarlyJungleAsJungler", 0),
            "earlyGanksOpponent": o_c.get("killsOnLanersEarlyJungleAsJungler", 0) if opponent else 0,
            "ccTime": participant.get("timeCCingOthers", 0),
            "ccTimeOpponent": opponent.get("timeCCingOthers", 0) if opponent else 0,
            "contestedKills": c.get("junglerTakedownsNearDamagedEpicMonster", 0),
            "contestedKillsOpponent": o_c.get("junglerTakedownsNearDamagedEpicMonster", 0) if opponent else 0,
        }