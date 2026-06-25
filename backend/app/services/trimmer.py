"""
===============================================================================
FICHIER : backend/app/services/trimmer.py
PROJET  : JungleDiff

DESCRIPTION :
Service de traitement de données (Data Engineering).
Agit comme un filtre entonnoir sur les payloads JSON massifs de l'API Riot Games 
pour imposer un contrat de données ultra-strict. L'objectif est de réduire 
drastiquement le poids des données stockées en base (PostgreSQL) tout en 
conservant une précision chirurgicale sur les métriques d'analyse macro, 
de vision, de combat, et la chronologie (Timeline) de la partie.
===============================================================================
"""

from typing import Dict, Any

class DataTrimmer:
    
    @staticmethod
    def trim_match_details(raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Disséque le JSON brut des détails de fin de partie (Match V5).
        
        Processus :
        1. Extrait les métadonnées globales du match (ID, version, durée).
        2. Agrège les objectifs globaux par équipe (Dénominateurs de l'analyse).
        3. Isole chaque participant et ne conserve que les clés racines vitales
           (Économie, Score de vision direct, Dégâts, Monstres tués absolus).
        4. Filtre le nœud complexe "challenges" pour extraire les exploits 
           situationnels (vols d'objectifs, ganks précoces, emprise spatiale).
           
        Retourne un dictionnaire allégé optimisé pour l'affichage de la MatchCard.
        """
        if not raw_data or "info" not in raw_data:
            return {}

        info = raw_data["info"]
        trimmed_data = {
            "metadata": {
                "matchId": raw_data.get("metadata", {}).get("matchId")
            },
            "info": {
                "gameId": info.get("gameId"),
                "gameDuration": info.get("gameDuration"),
                "gameCreation": info.get("gameCreation"),
                "gameVersion": info.get("gameVersion"),
                "teams": [],
                "participants": []
            }
        }

        # 1. Extraction des objectifs d'équipe (Dénominateurs)
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

        # 2. Extraction des participants
        for p in info.get("participants", []):
            trimmed_participant = {
                "puuid": p.get("puuid"),
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
                
                # Économie et Combat
                "goldEarned": p.get("goldEarned", 0),
                "totalDamageDealtToChampions": p.get("totalDamageDealtToChampions", 0),
                "totalMinionsKilled": p.get("totalMinionsKilled", 0),
                "neutralMinionsKilled": p.get("neutralMinionsKilled", 0),
                "totalAllyJungleMinionsKilled": p.get("totalAllyJungleMinionsKilled", 0),
                "totalEnemyJungleMinionsKilled": p.get("totalEnemyJungleMinionsKilled", 0),
                "damageDealtToObjectives": p.get("damageDealtToObjectives", 0),
                "visionScore": p.get("visionScore", 0),
                
                # Racines manquantes (Vision, Combats, Objectifs)
                "damageDealtToEpicMonsters": p.get("damageDealtToEpicMonsters", 0),
                "dragonKills": p.get("dragonKills", 0),
                "baronKills": p.get("baronKills", 0),
                "timeCCingOthers": p.get("timeCCingOthers", 0),
                "totalTimeCCDealt": p.get("totalTimeCCDealt", 0),
                "visionWardsBoughtInGame": p.get("visionWardsBoughtInGame", 0),
                "detectorWardsPlaced": p.get("detectorWardsPlaced", 0),
                "stealthWardsPlaced": p.get("stealthWardsPlaced", 0),

                # Compteurs d'utilisation des Sorts & Invocateurs
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
                
            # 3. Nœud Challenges Exhaustif
            challenges = p.get("challenges", {})
            trimmed_participant["challenges"] = {
                # Communs
                "killParticipation": challenges.get("killParticipation"),
                "teamDamagePercentage": challenges.get("teamDamagePercentage"),
                
                # C1: Farm & Économie
                "jungleCsBefore10Minutes": challenges.get("jungleCsBefore10Minutes"),
                "enemyJungleMonsterKills": challenges.get("enemyJungleMonsterKills"),
                "moreEnemyJungleThanOpponent": challenges.get("moreEnemyJungleThanOpponent"),
                "buffsStolen": challenges.get("buffsStolen"),
                "maxLevelLeadLaneOpponent": challenges.get("maxLevelLeadLaneOpponent"),
                "alliedJungleMonsterKills": challenges.get("alliedJungleMonsterKills"),
                
                # C2: Contrôle des Objectifs
                "initialCrabCount": challenges.get("initialCrabCount"),
                "scuttleCrabKills": challenges.get("scuttleCrabKills"),
                "voidMonsterKill": challenges.get("voidMonsterKill"),
                "epicMonsterSteals": challenges.get("epicMonsterSteals"),
                "epicMonsterStolenWithoutSmite": challenges.get("epicMonsterStolenWithoutSmite"),
                "epicMonsterKillsNearEnemyJungler": challenges.get("epicMonsterKillsNearEnemyJungler"),
                "earliestDragonTakedown": challenges.get("earliestDragonTakedown"),
                "earliestBaron": challenges.get("earliestBaron"),
                "teamElderDragonKills": challenges.get("teamElderDragonKills"),
                
                # C3: Pression & Combat
                "killsOnLanersEarlyJungleAsJungler": challenges.get("killsOnLanersEarlyJungleAsJungler"),
                "junglerKillsEarlyJungle": challenges.get("junglerKillsEarlyJungle"),
                "takedownsBeforeJungleMinionSpawn": challenges.get("takedownsBeforeJungleMinionSpawn"),
                "junglerTakedownsNearDamagedEpicMonster": challenges.get("junglerTakedownsNearDamagedEpicMonster"),
                
                # C4: Vision
                "visionScoreAdvantageLaneOpponent": challenges.get("visionScoreAdvantageLaneOpponent"),
                "visionScorePerMinute": challenges.get("visionScorePerMinute"),
                "controlWardTimeCoverageInRiverOrEnemyHalf": challenges.get("controlWardTimeCoverageInRiverOrEnemyHalf"),
                "wardTakedownsBefore20M": challenges.get("wardTakedownsBefore20M"),
                "wardTakedowns": challenges.get("wardTakedowns")
            }

            # Nettoyage des valeurs 'None' pour ne pas stocker les clés inexistantes
            trimmed_participant["challenges"] = {k: v for k, v in trimmed_participant["challenges"].items() if v is not None}
            trimmed_data["info"]["participants"].append(trimmed_participant)

        return trimmed_data

    @staticmethod
    def trim_match_timeline(raw_timeline: Dict[str, Any]) -> Dict[str, Any]:
        """
        Disséque le JSON brut de la timeline d'une partie.
        
        Processus :
        1. Itère sur chaque minute (frame) du match.
        2. Extrait l'état à la minute T pour chaque joueur (Position, Golds actuels, 
           Niveau, Minions tués).
        3. Filtre les événements (events) survenus pendant cette minute en utilisant 
           une liste blanche stricte (valid_event_types) pour ignorer le bruit 
           (comme les dégâts pris par les sbires).
           
        Retourne un objet allégé, prêt pour la construction de frises chronologiques 
        (items, sorts) et la fiabilisation des statistiques d'objectifs et de vision.
        """
        if not raw_timeline or "info" not in raw_timeline:
            return {}

        # Le dictionnaire strict d'ingestion (étendus aux items, sorts et vision)
        valid_event_types = {
            "CHAMPION_KILL", "ELITE_MONSTER_KILL", "BUILDING_KILL", "CHAMPION_SPECIAL_KILL",
            "ITEM_PURCHASED", "ITEM_UNDO", "ITEM_SOLD", "ITEM_DESTROYED",
            "SKILL_LEVEL_UP",
            "WARD_PLACED", "WARD_KILL"
        }
        
        trimmed_timeline = {
            "metadata": {"matchId": raw_timeline.get("metadata", {}).get("matchId")},
            "info": {"frames": []}
        }

        for frame in raw_timeline.get("info", {}).get("frames", []):
            trimmed_frame = {"participantFrames": {}, "events": []}
            
            for p_id, p_data in frame.get("participantFrames", {}).items():
                trimmed_frame["participantFrames"][p_id] = {
                    "position": p_data.get("position"),
                    "currentGold": p_data.get("currentGold"),
                    "level": p_data.get("level"),
                    "minionsKilled": p_data.get("minionsKilled"),
                    "jungleMinionsKilled": p_data.get("jungleMinionsKilled")
                }
                
            for event in frame.get("events", []):
                if event.get("type") in valid_event_types:
                    trimmed_frame["events"].append(event)
                    
            trimmed_timeline["info"]["frames"].append(trimmed_frame)

        return trimmed_timeline