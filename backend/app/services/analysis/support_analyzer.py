"""
===============================================================================
FICHIER : backend/app/services/analysis/support_analyzer.py
PROJET  : JungleDiff

DESCRIPTION :
Analyseur métier dédié au rôle de Support. 
Transforme les données brutes (détails et timeline) en métriques avancées
exploitables par le frontend.

MODIFICATIONS RÉCENTES :
- Refonte Architecturale : Suppression de la duplication de logique temporelle.
  Délégation du parcours des frames et de la gestion Data Dragon au parent 
  (BaseRoleAnalyzer) via l'injection d'une fonction d'extraction (Lambda).
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
        Associe un ID de champion à sa sous-classe (ex: ARTILLERY, ENCHANTER).
        """
        file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "core", "dictionaries", "archetypes.json")
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            return {}
    
    def _process_vision_timeline(self, participant_id: int, opp_id: int, timeline_data: Dict[str, Any], game_duration: int) -> Dict[str, Any]:
        """
        Extrait les événements liés à la vision (balises posées, détruites) et 
        calcule la préparation de la vision autour des monstres épiques.
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

    def analyze(self, participant: Dict[str, Any], match_data: Dict[str, Any], timeline_data: Dict[str, Any] = None, opponent: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Point d'entrée de l'analyseur. Calcule les métriques globales, hydrate 
        la vue Vision, et route dynamiquement les métriques de Combat selon l'archétype.
        """
        c = participant.get("challenges", {})
        o_c = opponent.get("challenges", {}) if opponent else {}
        champion_id = str(participant.get("championId"))
        archetype = self.archetypes.get(champion_id, "NON DEFINI")
        
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

        combat_data = {}
        if archetype == "ARTILLERY":
            # On passe une lambda qui dit à la classe parente quelle stat extraire de la frame
            extract_damage_fn = lambda p: {"totalDamage": p.get("damageStats", {}).get("totalDamageDoneToChampions", 0)}
            timeline_combat = self._extract_timeline_data(participant_id, timeline_data, extract_damage_fn)
            
            combat_data = {
                "damageToChampions": participant.get("totalDamageDealtToChampions", 0),
                "damageToChampionsOpponent": opponent.get("totalDamageDealtToChampions", 0) if opponent else 0,
                "damagePerMinute": c.get("damagePerMinute", 0),
                "damagePerMinuteOpponent": o_c.get("damagePerMinute", 0) if opponent else 0,
                "teamDamagePercentage": c.get("teamDamagePercentage", 0),
                "teamDamagePercentageOpponent": o_c.get("teamDamagePercentage", 0) if opponent else 0,
                "killParticipation": kp,
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
        elif archetype == "VANGUARD":
            # On passe une lambda qui indique au parent d'extraire l'encaissement
            extract_tank_fn = lambda p: {"totalDamage": p.get("damageStats", {}).get("totalDamageTaken", 0)}
            timeline_combat = self._extract_timeline_data(participant_id, timeline_data, extract_tank_fn)
            
            combat_data = {
                "archetype": "VANGUARD",
                "damageSelfMitigated": participant.get("damageSelfMitigated", 0),
                "damageSelfMitigatedOpponent": opponent.get("damageSelfMitigated", 0) if opponent else 0,
                "totalDamageTaken": participant.get("totalDamageTaken", 0),
                "totalDamageTakenOpponent": opponent.get("totalDamageTaken", 0) if opponent else 0,
                "damageTakenOnTeamPercentage": c.get("damageTakenOnTeamPercentage", 0),
                "damageTakenOnTeamPercentageOpponent": o_c.get("damageTakenOnTeamPercentage", 0) if opponent else 0,
                "killParticipation": kp,
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
        else:
            combat_data = {
                "kills": participant.get("kills", 0),
                "deaths": deaths,
                "assists": participant.get("assists", 0),
                "killParticipation": kp,
                "killParticipationOpponent": o_c.get("killParticipation", 0) if opponent else 0,
                "damageShielded": participant.get("totalDamageShieldedOnTeammates", 0),
                "heals": participant.get("totalHealsOnTeammates", 0),
                "ccTime": participant.get("timeCCingOthers", 0)
            }

        tabs_data = {
            "vision": {
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
                "controlWardCoverageOpponent": o_c.get("controlWardTimeCoverageInRiverOrEnemyHalf", 0),
                "playerQuestTime": timeline_vision["player_quest_time"],
                "oppQuestTime": timeline_vision["opp_quest_time"],
                "avgPreObjectiveWards": timeline_vision["avg_pre_objective_wards"],
                "timelineGraph": timeline_vision["graph_data"]
            },
            "combat": combat_data
        }

        return {
            "metadata": {"role": "SUPPORT", "archetype": archetype},
            "radar_data": radar_data,
            "insights": [],
            "tabs_data": tabs_data
        }