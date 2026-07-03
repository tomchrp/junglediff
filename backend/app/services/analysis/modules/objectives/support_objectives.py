"""
===============================================================================
FICHIER : backend/app/services/analysis/modules/objectives/support_objectives.py
PROJET  : JungleDiff

DESCRIPTION :
Module expert gérant l'extraction des statistiques d'objectifs spécifiques 
aux rôles de Support. Se concentre sur la domination de lane (siège, plaques, 
première tour) et le contrôle croisé de la carte (takedowns épiques).
===============================================================================
"""

from typing import Dict, Any
from app.services.analysis.modules.base_module import BaseMetricModule

class SupportObjectiveModule(BaseMetricModule):

    def _get_bot_tower_fall_time(self, timeline_data: Dict[str, Any], team_id: int) -> Dict[str, int]:
        """
        Parcourt la timeline pour identifier le moment exact de la destruction 
        des premières tourelles (T1) sur la botlane.
        """
        enemy_fall = None
        allied_fall = None
        
        if timeline_data and "info" in timeline_data:
            for frame in timeline_data["info"].get("frames", []):
                for event in frame.get("events", []):
                    if event.get("type") == "BUILDING_KILL" and event.get("buildingType") == "TOWER_BUILDING":
                        # On isole la T1 (OUTER_TURRET) de la botlane
                        if event.get("towerType") == "OUTER_TURRET" and event.get("laneType") == "BOT_LANE":
                            ts = event.get("timestamp", 0)
                            if event.get("teamId") == team_id:
                                if allied_fall is None: 
                                    allied_fall = ts
                            else:
                                if enemy_fall is None: 
                                    enemy_fall = ts
                                    
        return {"enemyBotTowerFall": enemy_fall, "alliedBotTowerFall": allied_fall}

    def compute(self, participant: Dict[str, Any], match_data: Dict[str, Any], timeline_data: Dict[str, Any] = None, opponent: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Assemble les métriques d'objectifs pour le Support.
        """
        c = participant.get("challenges", {})
        o_c = opponent.get("challenges", {}) if opponent else {}

        team_id = participant.get("teamId")
        opp_team_id = opponent.get("teamId") if opponent else None

        bot_towers = self._get_bot_tower_fall_time(timeline_data, team_id)
        opp_bot_towers = self._get_bot_tower_fall_time(timeline_data, opp_team_id) if opponent else {}

        # Boolean converti en entier (1 = Oui, 0 = Non) pour faciliter l'affichage stat
        first_tower_part = 1 if (participant.get("firstTowerKill") or participant.get("firstTowerAssist")) else 0
        opp_first_tower_part = 1 if opponent and (opponent.get("firstTowerKill") or opponent.get("firstTowerAssist")) else 0

        return {
            # 1. Siège et Domination
            "damageDealtToBuildings": participant.get("damageDealtToBuildings", 0),
            "damageDealtToBuildingsOpponent": opponent.get("damageDealtToBuildings", 0) if opponent else 0,
            "turretPlatesTaken": c.get("turretPlatesTaken", 0),
            "turretPlatesTakenOpponent": o_c.get("turretPlatesTaken", 0) if opponent else 0,
            "firstTowerParticipation": first_tower_part,
            "firstTowerParticipationOpponent": opp_first_tower_part,
            "enemyBotTowerFallTime": bot_towers.get("enemyBotTowerFall"),
            "enemyBotTowerFallTimeOpponent": opp_bot_towers.get("enemyBotTowerFall"),
            
            # 2. Contrôle Épique (Takedowns = Kill + Assists)
            "dragonTakedowns": c.get("dragonTakedowns", 0),
            "dragonTakedownsOpponent": o_c.get("dragonTakedowns", 0) if opponent else 0,
            "baronTakedowns": c.get("baronTakedowns", 0),
            "baronTakedownsOpponent": o_c.get("baronTakedowns", 0) if opponent else 0,
            "riftHeraldTakedowns": c.get("riftHeraldTakedowns", 0),
            "riftHeraldTakedownsOpponent": o_c.get("riftHeraldTakedowns", 0) if opponent else 0,
        }