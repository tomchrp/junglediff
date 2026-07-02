"""
===============================================================================
FICHIER : backend/app/services/analysis/modules/objectives/jungle_objectives.py
PROJET  : JungleDiff

DESCRIPTION :
Module expert gérant l'extraction de la prise d'objectifs neutres en Jungle.
===============================================================================
"""

from typing import Dict, Any

class JungleObjectiveModule:

    def compute(self, participant: Dict[str, Any], match_data: Dict[str, Any], timeline_data: Dict[str, Any] = None, opponent: Dict[str, Any] = None) -> Dict[str, Any]:
        c = participant.get("challenges", {})
        o_c = opponent.get("challenges", {}) if opponent else {}
        return {
            "scuttles": c.get("scuttleCrabKills", 0),
            "scuttlesOpponent": o_c.get("scuttleCrabKills", 0) if opponent else 0,
            "epicSteals": c.get("epicMonsterSteals", 0),
            "epicStealsOpponent": o_c.get("epicMonsterSteals", 0) if opponent else 0,
            "earlyObjectives": c.get("takedownsFirstXMinutes", 0),
            "earlyObjectivesOpponent": o_c.get("takedownsFirstXMinutes", 0) if opponent else 0,
            "damageToEpic": participant.get("damageDealtToObjectives", 0),
            "damageToEpicOpponent": opponent.get("damageDealtToObjectives", 0) if opponent else 0,
            "dragonKills": c.get("dragonTakedowns", 0),
            "dragonKillsOpponent": o_c.get("dragonTakedowns", 0) if opponent else 0,
            "baronKills": c.get("baronTakedowns", 0),
            "baronKillsOpponent": o_c.get("baronTakedowns", 0) if opponent else 0,
        }