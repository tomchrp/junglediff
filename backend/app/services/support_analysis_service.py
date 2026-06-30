"""
===============================================================================
FICHIER : backend/app/services/support_analysis_service.py
PROJET  : JungleDiff

DESCRIPTION :
Moteur analytique dédié au rôle de Support. 
Agissant comme un pont entre les données brutes élaguées et le frontend, 
il calcule les statistiques absolues, génère la série temporelle de vision, 
et extrait les métriques de combat agnostiques ainsi que celles spécifiques 
à chaque archétype (Enchanteur, Vanguard, Catcher, Artilleur).
===============================================================================
"""

from typing import Dict, Any, List

VALID_WARD_TYPES = {"YELLOW_TRINKET", "CONTROL_WARD", "SIGHT_WARD", "BLUE_TRINKET"}

class SupportAnalysisService:
    @staticmethod
    def analyze(match_data: Dict[str, Any], timeline_data: Dict[str, Any], player_puuid: str) -> Dict[str, Any]:
        """
        Génère l'empreinte complète du Support (Vision et Combat).
        """
        info = match_data.get("info", {})
        participants = info.get("participants", [])
        
        current_player = next((p for p in participants if p.get("puuid") == player_puuid), None)
        if not current_player:
            return {"error": "Joueur introuvable dans cette partie."}
            
        opponent = next((p for p in participants if 
                         p.get("teamPosition") == current_player.get("teamPosition") and 
                         p.get("teamId") != current_player.get("teamId")), {})
                         
        adc_ally = next((p for p in participants if 
                         p.get("teamPosition") == "BOTTOM" and 
                         p.get("teamId") == current_player.get("teamId")), {})

        challenges = current_player.get("challenges", {})

        # 1. Extraction Vision (Scalaires)
        summary = {
            "visionScore": current_player.get("visionScore", 0),
            "visionScorePerMinute": challenges.get("visionScorePerMinute", 0),
            "visionWardsBoughtInGame": current_player.get("visionWardsBoughtInGame", 0),
            "wardsPlaced": current_player.get("wardsPlaced", 0),
            "wardsKilled": current_player.get("wardsKilled", 0),
            "wardTakedownsBefore20M": challenges.get("wardTakedownsBefore20M", 0),
            "visionScoreAdvantage": challenges.get("visionScoreAdvantageLaneOpponent", 0),
            "controlWardCoverage": challenges.get("controlWardTimeCoverageInRiverOrEnemyHalf", 0)
        }
        
        # 2. Extraction Combat (Agnostique et Archétypes)
        
        # Récupération du temps de contrôle depuis la dernière frame de la timeline
        time_enemy_controlled = 0
        player_id_raw = current_player.get("participantId")
        if not player_id_raw:
            player_id_raw = participants.index(current_player) + 1
        player_id = str(player_id_raw) # Les clés de participantFrames sont des strings
        
        if timeline_data and "info" in timeline_data:
            frames = timeline_data["info"].get("frames", [])
            if frames:
                last_frame = frames[-1]
                p_frame = last_frame.get("participantFrames", {}).get(player_id, {})
                time_enemy_controlled = p_frame.get("timeEnemySpentControlled", 0)
        
        combat = {
            # Agnostique
            "killParticipation": challenges.get("killParticipation", 0),
            "deaths": current_player.get("deaths", 0),
            "kills": current_player.get("kills", 0),
            "assists": current_player.get("assists", 0),
            
            # Enchanteur
            "totalDamageShieldedOnTeammates": current_player.get("totalDamageShieldedOnTeammates", 0),
            
            # Vanguard
            "timeCCingOthers": current_player.get("timeCCingOthers", 0),
            
            # Catcher
            "timeEnemySpentControlled": time_enemy_controlled,
            "takedownsBeforeJungleMinionSpawn": challenges.get("takedownsBeforeJungleMinionSpawn", 0),
            
            # Artilleur
            "teamDamagePercentage": challenges.get("teamDamagePercentage", 0),
            "totalDamageDealtToChampions": current_player.get("totalDamageDealtToChampions", 0),
            "adcTotalDamageDealtToChampions": adc_ally.get("totalDamageDealtToChampions", 0)
        }

        # 3. Traitement des Séries Temporelles (Modèle Événementiel Exact)
        timeline_events = []
        player_id_int = int(player_id_raw)
        
        opponent_id = -1
        if opponent:
            opp_id_raw = opponent.get("participantId")
            if not opp_id_raw:
                opp_id_raw = participants.index(opponent) + 1
            opponent_id = int(opp_id_raw)
            
        if timeline_data and "info" in timeline_data:
            frames = timeline_data["info"].get("frames", [])
            for frame in frames:
                for event in frame.get("events", []):
                    event_type = event.get("type")
                    if event_type in ["WARD_PLACED", "WARD_KILL"]:
                        ward_type = event.get("wardType")
                        if ward_type not in VALID_WARD_TYPES:
                            continue
                            
                        actor_raw = event.get("creatorId") if event_type == "WARD_PLACED" else event.get("killerId")
                        if actor_raw is not None:
                            actor_id = int(actor_raw)
                            if actor_id in [player_id_int, opponent_id]:
                                timeline_events.append({
                                    "timestamp_ms": int(event.get("timestamp", 0)),
                                    "type": event_type,
                                    "is_player": actor_id == player_id_int
                                })

        timeline_events.sort(key=lambda x: x["timestamp_ms"])
        chart_data = [{"minute": 0.0, "playerWardsPlaced": 0, "playerWardsKilled": 0, "opponentWardsPlaced": 0}]
        p_placed, p_killed, o_placed = 0, 0, 0
        
        for ev in timeline_events:
            exact_minute = round(ev["timestamp_ms"] / 60000.0, 3)
            if ev["is_player"]:
                if ev["type"] == "WARD_PLACED":
                    p_placed += 1
                elif ev["type"] == "WARD_KILL":
                    p_killed += 1
            else:
                if ev["type"] == "WARD_PLACED":
                    o_placed += 1
                    
            chart_data.append({
                "minute": exact_minute,
                "playerWardsPlaced": p_placed,
                "playerWardsKilled": p_killed,
                "opponentWardsPlaced": o_placed
            })

        raw_duration = info.get("gameDuration", 0)
        if raw_duration > 10000: 
            raw_duration = raw_duration // 1000
        end_minute = round(raw_duration / 60.0, 3)
        
        if not chart_data or end_minute > chart_data[-1]["minute"]:
            chart_data.append({
                "minute": end_minute,
                "playerWardsPlaced": p_placed,
                "playerWardsKilled": p_killed,
                "opponentWardsPlaced": o_placed
            })

        return {
            "summary": summary,
            "combat": combat,
            "chartData": chart_data
        }