"""
===============================================================================
FICHIER : backend/app/services/trimmer.py
PROJET  : JungleDiff

DESCRIPTION :
Service de traitement de données (Data Engineering).
Ce composant agit comme un filtre pour réduire drastiquement la taille des 
JSON bruts de l'API Riot avant leur insertion en base de données (Warm Storage).

MODIFICATIONS (PHASE 3 BIG DATA & JUNGLE PATHING) :
- trim_match_timeline : Récupération de `totalGold` et `xp` pour l'analyse
  de phase de lane (négligés dans la version précédente).
- _extract_early_pathing : Nouvelle méthode utilitaire chargée de récupérer 
  les coordonnées (x,y) d'un joueur aux minutes 1, 2 et 3.
- extract_timeline_metrics : Mise à jour pour inclure les coordonnées spatiales 
  dans le dictionnaire retourné, centralisant ainsi l'extraction Hot Storage.
===============================================================================
"""

from typing import Dict, Any

class DataTrimmer:
    
    @staticmethod
    def trim_match_details(raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Nettoie le payload des détails de match pour ne conserver que l'essentiel 
        lié aux objets, dégâts, objectifs et runes.
        """
        if not raw_data or "info" not in raw_data:
            return {}

        info = raw_data["info"]
        trimmed_data = {
            "metadata": {"matchId": raw_data.get("metadata", {}).get("matchId")},
            "info": {
                "gameId": info.get("gameId"),
                "queueId": info.get("queueId"),
                "gameDuration": info.get("gameDuration"),
                "gameCreation": info.get("gameCreation"),
                "gameVersion": info.get("gameVersion"),
                "teams": [],
                "participants": []
            }
        }

        for team in info.get("teams", []):
            objectives = team.get("objectives", {})
            trimmed_data["info"]["teams"].append({
                "teamId": team.get("teamId"),
                "win": team.get("win"),
                "objectives": {
                    "baron": objectives.get("baron", {}).get("kills", 0),
                    "dragon": objectives.get("dragon", {}).get("kills", 0),
                    "horde": objectives.get("horde", {}).get("kills", 0),
                    "riftHerald": objectives.get("riftHerald", {}).get("kills", 0),
                    "atakhan": objectives.get("atakhan", {}).get("kills", 0)
                }
            })

        for p in info.get("participants", []):
            trimmed_participant = {
                "puuid": p.get("puuid"),
                "participantId": p.get("participantId"),
                "riotIdGameName": p.get("riotIdGameName"),
                "riotIdTagline": p.get("riotIdTagline"),
                "teamId": p.get("teamId"),
                "championId": p.get("championId"),
                "championName": p.get("championName"),
                "teamPosition": p.get("teamPosition"),
                "win": p.get("win"),
                
                "kills": p.get("kills", 0),
                "deaths": p.get("deaths", 0),
                "assists": p.get("assists", 0),
                "summoner1Id": p.get("summoner1Id"),
                "summoner2Id": p.get("summoner2Id"),
                
                "goldEarned": p.get("goldEarned", 0),
                "goldSpent": p.get("goldSpent", 0),
                "totalDamageDealtToChampions": p.get("totalDamageDealtToChampions", 0),
                "totalMinionsKilled": p.get("totalMinionsKilled", 0),
                "neutralMinionsKilled": p.get("neutralMinionsKilled", 0),
                "totalAllyJungleMinionsKilled": p.get("totalAllyJungleMinionsKilled", 0),
                "totalEnemyJungleMinionsKilled": p.get("totalEnemyJungleMinionsKilled", 0),
                "damageDealtToObjectives": p.get("damageDealtToObjectives", 0),
                "damageDealtToEpicMonsters": p.get("damageDealtToEpicMonsters", 0),
                "dragonKills": p.get("dragonKills", 0),
                "baronKills": p.get("baronKills", 0),
                
                "damageDealtToBuildings": p.get("damageDealtToBuildings", 0),
                "firstTowerKill": p.get("firstTowerKill", False),
                "firstTowerAssist": p.get("firstTowerAssist", False),
                "firstBloodKill": p.get("firstBloodKill", False),
                "firstBloodAssist": p.get("firstBloodAssist", False),
                
                "totalDamageShieldedOnTeammates": p.get("totalDamageShieldedOnTeammates", 0),
                "totalHealsOnTeammates": p.get("totalHealsOnTeammates", 0),
                "timeCCingOthers": p.get("timeCCingOthers", 0),
                "totalTimeCCDealt": p.get("totalTimeCCDealt", 0),
                "longestTimeSpentLiving": p.get("longestTimeSpentLiving", 0),
                "magicDamageDealtToChampions": p.get("magicDamageDealtToChampions", 0),
                
                "damageSelfMitigated": p.get("damageSelfMitigated", 0),
                "totalDamageTaken": p.get("totalDamageTaken", 0),
                
                "visionScore": p.get("visionScore", 0),
                "wardsKilled": p.get("wardsKilled", 0),
                "wardsPlaced": p.get("wardsPlaced", 0),
                "visionWardsBoughtInGame": p.get("visionWardsBoughtInGame", 0),
                "detectorWardsPlaced": p.get("detectorWardsPlaced", 0),
                "stealthWardsPlaced": p.get("stealthWardsPlaced", 0),

                "spell1Casts": p.get("spell1Casts", 0),
                "spell2Casts": p.get("spell2Casts", 0),
                "spell3Casts": p.get("spell3Casts", 0),
                "spell4Casts": p.get("spell4Casts", 0),
                "summoner1Casts": p.get("summoner1Casts", 0),
                "summoner2Casts": p.get("summoner2Casts", 0),
                
                "perks": {},
                "challenges": {}
            }
            
            for i in range(7):
                item_key = f"item{i}"
                trimmed_participant[item_key] = p.get(item_key, 0)
                
            try:
                styles = p.get("perks", {}).get("styles", [])
                if len(styles) >= 2:
                    trimmed_participant["perks"] = {
                        "primaryStyle": styles[0].get("style"),
                        "primarySelection": styles[0].get("selections", [{}])[0].get("perk"),
                        "subStyle": styles[1].get("style")
                    }
            except Exception:
                pass 
                
            raw_challenges = p.get("challenges", {})
            trimmed_participant["challenges"] = {
                k: v for k, v in raw_challenges.items() if v is not None
            }

            trimmed_data["info"]["participants"].append(trimmed_participant)

        return trimmed_data

    @staticmethod
    def trim_match_timeline(raw_timeline: Dict[str, Any]) -> Dict[str, Any]:
        """
        Nettoie le payload de la timeline. Conserve exclusivement les événements
        clés et les frames économiques. Intègre totalGold et xp pour les futures
        analyses temporelles de lane.
        """
        if not raw_timeline or "info" not in raw_timeline:
            return {}

        valid_event_types = {
            "CHAMPION_KILL", "ELITE_MONSTER_KILL", "BUILDING_KILL", "CHAMPION_SPECIAL_KILL",
            "ITEM_PURCHASED", "ITEM_UNDO", "ITEM_SOLD", "ITEM_DESTROYED",
            "SKILL_LEVEL_UP", "WARD_PLACED", "WARD_KILL"
        }
        
        trimmed_timeline = {
            "metadata": {"matchId": raw_timeline.get("metadata", {}).get("matchId")},
            "info": {"frames": []}
        }

        for frame in raw_timeline.get("info", {}).get("frames", []):
            trimmed_frame = {"participantFrames": {}, "events": [], "timestamp": frame.get("timestamp", 0)}
            
            for p_id, p_data in frame.get("participantFrames", {}).items():
                trimmed_frame["participantFrames"][p_id] = {
                    "position": p_data.get("position"),
                    "currentGold": p_data.get("currentGold"),
                    "totalGold": p_data.get("totalGold"), 
                    "xp": p_data.get("xp"),               
                    "level": p_data.get("level"),
                    "minionsKilled": p_data.get("minionsKilled"),
                    "jungleMinionsKilled": p_data.get("jungleMinionsKilled"),
                    "timeEnemySpentControlled": p_data.get("timeEnemySpentControlled"),
                    "damageStats": p_data.get("damageStats", {}) 
                }
                
            for event in frame.get("events", []):
                ev_type = event.get("type")
                if ev_type in valid_event_types:
                    light_event = {
                        "type": ev_type,
                        "timestamp": event.get("timestamp")
                    }
                    
                    if ev_type in ["WARD_PLACED", "WARD_KILL"]:
                        light_event["creatorId"] = event.get("creatorId")
                        light_event["killerId"] = event.get("killerId")
                        light_event["wardType"] = event.get("wardType")
                        
                    elif ev_type == "ELITE_MONSTER_KILL":
                        light_event["killerId"] = event.get("killerId")
                        light_event["monsterType"] = event.get("monsterType")
                        light_event["monsterSubType"] = event.get("monsterSubType")
                        light_event["position"] = event.get("position")
                        
                    elif ev_type == "ITEM_PURCHASED":
                        light_event["participantId"] = event.get("participantId")
                        light_event["itemId"] = event.get("itemId")
                        
                    elif ev_type == "BUILDING_KILL":
                        light_event["teamId"] = event.get("teamId")
                        light_event["buildingType"] = event.get("buildingType")
                        light_event["towerType"] = event.get("towerType")
                        light_event["laneType"] = event.get("laneType")
                        light_event["killerId"] = event.get("killerId")
                    
                    elif ev_type == "CHAMPION_KILL":
                        light_event["killerId"] = event.get("killerId")
                        light_event["victimId"] = event.get("victimId")
                        light_event["assistingParticipantIds"] = event.get("assistingParticipantIds", [])
                        light_event["position"] = event.get("position")
                        
                    trimmed_frame["events"].append(light_event)
                    
            trimmed_timeline["info"]["frames"].append(trimmed_frame)

        return trimmed_timeline

    @staticmethod
    def _extract_early_pathing(frames: list, participant_id_str: str) -> dict:
        """
        Extrait les coordonnées spatiales X et Y d'un joueur aux minutes 1, 2 et 3.
        
        Cette fonction est conçue pour être tolérante aux pannes : si la partie 
        est un Remake (moins de 3 frames) ou si le joueur est AFK (pas de position), 
        la valeur None est renvoyée pour empêcher l'écrasement ou le crash.
        """
        positions = {
            "pos_f1_x": None, "pos_f1_y": None,
            "pos_f2_x": None, "pos_f2_y": None,
            "pos_f3_x": None, "pos_f3_y": None,
        }
        
        for minute in [1, 2, 3]:
            if minute < len(frames):
                participant_frame = frames[minute].get("participantFrames", {}).get(participant_id_str, {})
                pos = participant_frame.get("position")
                
                if pos:
                    positions[f"pos_f{minute}_x"] = pos.get("x")
                    positions[f"pos_f{minute}_y"] = pos.get("y")
                    
        return positions

    @staticmethod
    def extract_timeline_metrics(trimmed_match: Dict[str, Any], trimmed_timeline: Dict[str, Any], target_minute: int = 15) -> Dict[str, Any]:
        """
        Extrait les métriques croisées et spatiales afin d'hydrater la table MatchParticipant.
        
        Opérations :
        - Parcourt les frames pour extraire les deltas économiques à la 15ème minute (vis-à-vis).
        - Appelle la méthode `_extract_early_pathing` pour récupérer le parcours initial.
        
        Retourne : 
        { "puuid_du_joueur": {"gold_diff_15m": X, "pos_f1_x": Y, ...} }
        """
        metrics = {}
        if not trimmed_match or not trimmed_timeline:
            return metrics
            
        participants = trimmed_match.get("info", {}).get("participants", [])
        frames = trimmed_timeline.get("info", {}).get("frames", [])
        
        target_timestamp_ms = target_minute * 60 * 1000
        target_frame = None
        
        # Identification de la frame temporelle ciblée pour l'économie
        for frame in frames:
            if frame.get("timestamp", 0) >= target_timestamp_ms:
                target_frame = frame
                break
                
        # Si la partie s'est terminée par un surrender avant 15 minutes
        if not target_frame and frames:
            target_frame = frames[-1]
            
        if not target_frame:
            return metrics
            
        # Mapping relationnel : Assigner le participantId à son rôle et son équipe
        role_map = {}
        participant_map = {}
        
        for p in participants:
            p_id = str(p.get("participantId"))
            team_id = p.get("teamId")
            pos = p.get("teamPosition", "NONE")
            puuid = p.get("puuid")
            
            participant_map[p_id] = {"puuid": puuid, "pos": pos, "team_id": team_id}
            
            if pos != "NONE" and pos != "":
                if pos not in role_map:
                    role_map[pos] = {}
                role_map[pos][team_id] = p_id
                
        participant_frames = target_frame.get("participantFrames", {})
        
        # Calcul des écarts pour chaque joueur
        for p_id_str, p_info in participant_map.items():
            puuid = p_info["puuid"]
            pos = p_info["pos"]
            my_team = p_info["team_id"]
            enemy_team = 200 if my_team == 100 else 100
            
            my_frame = participant_frames.get(p_id_str, {})
            my_gold = my_frame.get("totalGold", 0)
            my_xp = my_frame.get("xp", 0)
            
            gold_diff = None
            xp_diff = None
            
            if pos in role_map and enemy_team in role_map[pos]:
                enemy_p_id_str = role_map[pos][enemy_team]
                enemy_frame = participant_frames.get(enemy_p_id_str, {})
                enemy_gold = enemy_frame.get("totalGold", 0)
                enemy_xp = enemy_frame.get("xp", 0)
                
                gold_diff = my_gold - enemy_gold
                xp_diff = my_xp - enemy_xp
            
            is_snowballing = False
            if gold_diff is not None:
                is_snowballing = gold_diff >= 1000
                
            # Extraction des données spatiales du early game
            pathing_data = DataTrimmer._extract_early_pathing(frames, p_id_str)
                
            metrics[puuid] = {
                "gold_diff_15m": gold_diff,
                "xp_diff_15m": xp_diff,
                "is_snowballing": is_snowballing,
                **pathing_data  # Injection des coordonnées dans le dictionnaire
            }
            
        return metrics