"""
===============================================================================
FICHIER : backend/app/services/analysis/modules/vision/support_vision.py
PROJET  : JungleDiff

DESCRIPTION :
Module expert gérant l'extraction des statistiques de vision pour le rôle 
Support. Calcule la part d'équipe, la couverture et parse la timeline pour 
retracer la quête d'objet de vision et le setup d'objectifs neutres.
===============================================================================
"""

from typing import Dict, Any
from app.services.analysis.modules.base_module import BaseMetricModule

class SupportVisionModule(BaseMetricModule):
    
    def _process_vision_timeline(self, participant_id: int, opp_id: int, timeline_data: Dict[str, Any], game_duration: int) -> Dict[str, Any]:
        """
        Parcourt l'intégralité des frames temporelles pour tracer l'évolution 
        des balises posées et détruites. Calcule également le timer d'obtention 
        de la quête d'objet Support et la préparation de vision autour des monstres épiques.
        """
        events = []
        if timeline_data and "info" in timeline_data:
            for frame in timeline_data["info"].get("frames", []):
                events.extend(frame.get("events", []))
                
        events.sort(key=lambda x: x.get("timestamp", 0))

        vision_events = [{"timestamp": 0, "playerPlaced": 0, "oppPlaced": 0, "playerKilled": 0, "oppKilled": 0}]
        p_placed = 0
        o_placed = 0
        p_killed = 0
        o_killed = 0
        
        player_quest_time = None
        opp_quest_time = None
        pre_objective_wards = 0
        
        elite_monster_kills = [e for e in events if e.get("type") == "ELITE_MONSTER_KILL"]
        total_objectives = len(elite_monster_kills)

        for event in events:
            e_type = event.get("type")
            ts = event.get("timestamp", 0)
            is_vision_event = False

            if e_type == "WARD_PLACED":
                creator = event.get("creatorId")
                w_type = event.get("wardType")
                
                if creator == participant_id:
                    p_placed += 1
                    is_vision_event = True
                    if not player_quest_time and w_type == "SIGHT_WARD":
                        player_quest_time = ts
                    for obj in elite_monster_kills:
                        obj_ts = obj.get("timestamp", 0)
                        if obj_ts - 60000 <= ts <= obj_ts:
                            pre_objective_wards += 1
                elif creator == opp_id:
                    o_placed += 1
                    is_vision_event = True
                    if not opp_quest_time and w_type == "SIGHT_WARD":
                        opp_quest_time = ts

            elif e_type == "WARD_KILL":
                killer = event.get("killerId")
                if killer == participant_id:
                    p_killed += 1
                    is_vision_event = True
                elif killer == opp_id:
                    o_killed += 1
                    is_vision_event = True

            if is_vision_event:
                vision_events.append({
                    "timestamp": ts,
                    "playerPlaced": p_placed,
                    "oppPlaced": o_placed,
                    "playerKilled": p_killed,
                    "oppKilled": o_killed
                })

        final_ts = game_duration * 1000
        vision_events.append({
            "timestamp": final_ts,
            "playerPlaced": p_placed,
            "oppPlaced": o_placed,
            "playerKilled": p_killed,
            "oppKilled": o_killed
        })

        avg_pre_objective = round(pre_objective_wards / total_objectives, 1) if total_objectives > 0 else 0

        return {
            "graph_data": {"events": vision_events},
            "player_quest_time": player_quest_time,
            "opp_quest_time": opp_quest_time,
            "avg_pre_objective_wards": avg_pre_objective
        }

    def compute(self, participant: Dict[str, Any], match_data: Dict[str, Any], timeline_data: Dict[str, Any] = None, opponent: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Assemble les statistiques de vision brutes et temporelles pour former 
        le dictionnaire exact attendu par l'onglet Vision du frontend.
        """
        c = participant.get("challenges", {})
        o_c = opponent.get("challenges", {}) if opponent else {}
        
        team_id = participant.get("teamId")
        team_participants = [p for p in match_data.get("info", {}).get("participants", []) if p.get("teamId") == team_id]
        total_team_vision = sum(p.get("visionScore", 0) for p in team_participants)
        team_vision_share = participant.get("visionScore", 0) / total_team_vision if total_team_vision else 0

        team_vision_share_opponent = 0
        if opponent:
            opp_team_id = opponent.get("teamId")
            opp_team_participants = [p for p in match_data.get("info", {}).get("participants", []) if p.get("teamId") == opp_team_id]
            total_opp_team_vision = sum(p.get("visionScore", 0) for p in opp_team_participants)
            team_vision_share_opponent = opponent.get("visionScore", 0) / total_opp_team_vision if total_opp_team_vision else 0

        game_duration = match_data.get("info", {}).get("gameDuration", 0)
        participant_id = participant.get("participantId")
        opp_id = opponent.get("participantId") if opponent else None
        
        timeline_vision = self._process_vision_timeline(participant_id, opp_id, timeline_data, game_duration)
        vision_per_min = c.get("visionScorePerMinute", 0)

        return {
            "visionScore": participant.get("visionScore", 0),
            "visionScoreOpponent": opponent.get("visionScore", 0) if opponent else 0,
            "visionScorePerMinute": vision_per_min,
            "visionScorePerMinuteOpponent": o_c.get("visionScorePerMinute", 0) if opponent else 0,
            "wardsPlaced": participant.get("wardsPlaced", 0),
            "wardsPlacedOpponent": opponent.get("wardsPlaced", 0) if opponent else 0,
            "wardsKilled": participant.get("wardsKilled", 0),
            "wardsKilledOpponent": opponent.get("wardsKilled", 0) if opponent else 0,
            "controlWardsBought": participant.get("visionWardsBoughtInGame", 0),
            "controlWardsBoughtOpponent": opponent.get("visionWardsBoughtInGame", 0) if opponent else 0,
            "teamVisionShare": team_vision_share,
            "teamVisionShareOpponent": team_vision_share_opponent,
            "controlWardCoverage": c.get("controlWardTimeCoverageInRiverOrEnemyHalf", 0),
            "controlWardCoverageOpponent": o_c.get("controlWardTimeCoverageInRiverOrEnemyHalf", 0) if opponent else 0,
            "playerQuestTime": timeline_vision["player_quest_time"],
            "oppQuestTime": timeline_vision["opp_quest_time"],
            "avgPreObjectiveWards": timeline_vision["avg_pre_objective_wards"],
            "timelineGraph": timeline_vision["graph_data"]
        }