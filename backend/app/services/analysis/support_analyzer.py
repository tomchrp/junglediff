"""
===============================================================================
FICHIER : backend/app/services/analysis/support_analyzer.py
PROJET  : JungleDiff

DESCRIPTION :
Analyseur métier dédié au rôle de Support. 
Génère les statistiques, le graphe de vision (via l'ingestion de la timeline)
et prépare les données pour la vue UI.
La logique de fenêtres d'aveuglement (blackout) a été supprimée car 
trop instable sans tracking d'identifiants uniques pour les balises.
===============================================================================
"""

import json
import os
from typing import Dict, Any
from app.services.analysis.base_analyzer import BaseRoleAnalyzer

class SupportAnalyzer(BaseRoleAnalyzer):
    
    def __init__(self):
        self.archetypes = self._load_archetypes()

    def _load_archetypes(self) -> Dict[str, str]:
        """
        Charge le dictionnaire des archétypes de champions depuis le disque.
        Permet d'adapter l'analyse en fonction de la classe du champion.
        """
        file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "core", "dictionaries", "archetypes.json")
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            return {}

    def _process_vision_timeline(self, participant_id: int, opp_id: int, timeline_data: Dict[str, Any], game_duration: int) -> Dict[str, Any]:
        """
        Analyse les événements de la timeline pour extraire :
        - Les points de données exacts (timestamp) pour les courbes cumulées.
        - Les proxies temporels (setups d'objectifs, timer de quête).
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
            "graph_data": {
                "events": vision_events
            },
            "player_quest_time": player_quest_time,
            "opp_quest_time": opp_quest_time,
            "avg_pre_objective_wards": avg_pre_objective
        }

    def analyze(self, participant: Dict[str, Any], match_data: Dict[str, Any], timeline_data: Dict[str, Any] = None, opponent: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Construit le payload analytique complet pour le rôle Support, 
        fusionnant les statistiques de fin de partie avec celles extraites 
        dynamiquement de la timeline.
        """
        c = participant.get("challenges", {})
        o_c = opponent.get("challenges", {}) if opponent else {}
        champion_id = str(participant.get("championId"))
        archetype = self.archetypes.get(champion_id, "NON DEFINI")
        
        team_id = participant.get("teamId")
        team_participants = [p for p in match_data.get("info", {}).get("participants", []) if p.get("teamId") == team_id]
        total_team_vision = sum(p.get("visionScore", 0) for p in team_participants)
        team_vision_share = participant.get("visionScore", 0) / total_team_vision if total_team_vision else 0

        game_duration = match_data.get("info", {}).get("gameDuration", 0)
        participant_id = participant.get("participantId")
        opp_id = opponent.get("participantId") if opponent else None
        
        timeline_metrics = self._process_vision_timeline(participant_id, opp_id, timeline_data, game_duration)

        vision_per_min = c.get("visionScorePerMinute", 0)
        vision_score_normalized = min(100, int((vision_per_min / 3.5) * 100)) if vision_per_min else 0
        deaths = participant.get("deaths", 0)
        survival_score = 100 if deaths == 0 else max(0, 100 - (deaths * 10))
        kp = c.get("killParticipation", 0)
        
        radar_data = [
            {"axe": "Vision", "scoreJoueur": vision_score_normalized, "scoreAdversaire": 50},
            {"axe": "Presence", "scoreJoueur": int(kp * 100), "scoreAdversaire": 50},
            {"axe": "Survie", "scoreJoueur": survival_score, "scoreAdversaire": 50},
            {"axe": "Utilitaire", "scoreJoueur": 80, "scoreAdversaire": 75},
            {"axe": "Pression", "scoreJoueur": 55, "scoreAdversaire": 85}
        ]

        tabs_data = {
            "vision": {
                "visionScore": participant.get("visionScore", 0),
                "visionScoreOpponent": opponent.get("visionScore", 0) if opponent else 0,
                "visionScorePerMinute": vision_per_min,
                "visionScorePerMinuteOpponent": o_c.get("visionScorePerMinute", 0) if opponent else 0,
                
                "wardsPlaced": participant.get("wardsPlaced", 0),
                "wardsKilled": participant.get("wardsKilled", 0),
                "controlWardsBought": participant.get("visionWardsBoughtInGame", 0),
                
                "teamVisionShare": team_vision_share,
                "controlWardCoverage": c.get("controlWardTimeCoverageInRiverOrEnemyHalf", 0),
                
                "playerQuestTime": timeline_metrics["player_quest_time"],
                "oppQuestTime": timeline_metrics["opp_quest_time"],
                "avgPreObjectiveWards": timeline_metrics["avg_pre_objective_wards"],
                "timelineGraph": timeline_metrics["graph_data"]
            },
            "combat": {
                "kills": participant.get("kills", 0),
                "deaths": deaths,
                "assists": participant.get("assists", 0),
                "killParticipation": kp,
                "damageToChampions": participant.get("totalDamageDealtToChampions", 0),
                "damageShielded": participant.get("totalDamageShieldedOnTeammates", 0),
                "heals": participant.get("totalHealsOnTeammates", 0),
                "ccTime": participant.get("timeCCingOthers", 0)
            }
        }

        return {
            "metadata": {"role": "SUPPORT", "archetype": archetype},
            "radar_data": radar_data,
            "insights": [],
            "tabs_data": tabs_data
        }