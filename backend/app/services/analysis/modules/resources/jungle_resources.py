"""
===============================================================================
FICHIER : backend/app/services/analysis/modules/resources/jungle_resources.py
PROJET  : JungleDiff

DESCRIPTION :
Module expert gérant l'extraction de l'économie en Jungle (Farming, Invades).
===============================================================================
"""

from typing import Dict, Any

class JungleResourceModule:

    def compute(self, participant: Dict[str, Any], match_data: Dict[str, Any], timeline_data: Dict[str, Any] = None, opponent: Dict[str, Any] = None) -> Dict[str, Any]:
        c = participant.get("challenges", {})
        o_c = opponent.get("challenges", {}) if opponent else {}
        return {
            "allyJungleCS": participant.get("totalAllyJungleMinionsKilled", 0),
            "allyJungleCSOpponent": opponent.get("totalAllyJungleMinionsKilled", 0) if opponent else 0,
            "enemyJungleCS": participant.get("totalEnemyJungleMinionsKilled", 0),
            "enemyJungleCSOpponent": opponent.get("totalEnemyJungleMinionsKilled", 0) if opponent else 0,
            "buffsStolen": c.get("buffsStolen", 0),
            "buffsStolenOpponent": o_c.get("buffsStolen", 0) if opponent else 0,
            "goldEarned": participant.get("goldEarned", 0),
            "goldEarnedOpponent": opponent.get("goldEarned", 0) if opponent else 0,
            "earlyGold": c.get("laneMinionsFirst10Minutes", 0), 
            "earlyGoldOpponent": o_c.get("laneMinionsFirst10Minutes", 0) if opponent else 0,
            "earlyXP": participant.get("champLevel", 0),
            "earlyXPOpponent": opponent.get("champLevel", 0) if opponent else 0,
        }