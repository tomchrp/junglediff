"""
===============================================================================
FICHIER : backend/app/services/analysis/jungle_analyzer.py
PROJET  : JungleDiff

DESCRIPTION :
Analyseur métier dédié au rôle de Jungler. 
* HARMONISATION : Supprime le pré-calcul manuel des Deltas. Fournit systématiquement
les valeurs brutes avec la convention de nommage 'Opponent' pour permettre
au composant React <StatDelta> de gérer l'affichage de manière agnostique.
===============================================================================
"""

import json
import os
from typing import Dict, Any
from app.services.analysis.base_analyzer import BaseRoleAnalyzer

class JungleAnalyzer(BaseRoleAnalyzer):

    def __init__(self):
        self.archetypes = self._load_archetypes()

    def _load_archetypes(self) -> Dict[str, str]:
        file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "core", "dictionaries", "archetypes.json")
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            return {}

    def analyze(self, participant: Dict[str, Any], match_data: Dict[str, Any], timeline_data: Dict[str, Any] = None, opponent: Dict[str, Any] = None) -> Dict[str, Any]:
        c = participant.get("challenges", {})
        o_c = opponent.get("challenges", {}) if opponent else {}
        
        champion_id = str(participant.get("championId"))
        archetype = self.archetypes.get(champion_id, "NON DEFINI")

        tabs_data = {
            "resources": {
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
            },
            "objectives": {
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
            },
            "combat": {
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
            },
            "vision": {
                "visionScore": participant.get("visionScore", 0),
                "visionScoreOpponent": opponent.get("visionScore", 0) if opponent else 0,
                "visionPerMinute": c.get("visionScorePerMinute", 0),
                "visionPerMinuteOpponent": o_c.get("visionScorePerMinute", 0) if opponent else 0,
                "pinkWards": participant.get("visionWardsBoughtInGame", 0),
                "pinkWardsOpponent": opponent.get("visionWardsBoughtInGame", 0) if opponent else 0,
                "detectorWards": participant.get("detectorWardsPlaced", 0),
                "detectorWardsOpponent": opponent.get("detectorWardsPlaced", 0) if opponent else 0,
                "stealthWards": participant.get("stealthWardsPlaced", 0),
                "stealthWardsOpponent": opponent.get("stealthWardsPlaced", 0) if opponent else 0,
                "wardsKilled": participant.get("wardsKilled", 0),
                "wardsKilledOpponent": opponent.get("wardsKilled", 0) if opponent else 0,
                "wardsKilledBefore20": c.get("wardTakedownsBefore20M", 0),
                "wardsKilledBefore20Opponent": o_c.get("wardTakedownsBefore20M", 0) if opponent else 0,
            }
        }

        # Pour l'instant, on fixe la data radar en dur ou vide le temps de l'implémenter plus tard
        radar_data = []

        return {
            "metadata": {"role": "JUNGLE", "archetype": archetype},
            "radar_data": radar_data,
            "insights": [],
            "tabs_data": tabs_data
        }