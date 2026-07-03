"""
===============================================================================
FICHIER : backend/app/services/analysis/modules/vision/jungle_vision.py
PROJET  : JungleDiff

DESCRIPTION :
Module expert gérant l'extraction de la vision spécifique à la Jungle.
Contrairement au Support centré sur la création, ce module valorise le déni 
de vision (Brouilleur Optique), le contrôle territorial (Rivière/Invade) et 
la sécurisation des monstres épiques (Blackout).

MODIFICATIONS :
- Remplacement de la clé 'pinkWardsBought' par 'controlWardsBought' pour 
  standardisation avec le frontend et les autres rôles.
- Ajout des clés visionScore et visionScoreOpponent manquantes.
- Correction du chemin d'accès pour stealthWardsPlaced (via 'challenges').
===============================================================================
"""

from typing import Dict, Any
from app.services.analysis.modules.base_module import BaseMetricModule

class JungleVisionModule(BaseMetricModule):

    def _process_blackout_timeline(self, participant_id: int, opp_id: int, timeline_data: Dict[str, Any], game_duration: int) -> Dict[str, Any]:
        """
        Parcourt la timeline de la partie pour générer le graphique d'accumulation 
        des balises détruites (Brouillard). Calcule le "Blackout d'objectifs", 
        soit la moyenne de balises détruites par le jungler dans la fenêtre de 
        60 secondes précédant la mort de chaque monstre épique.
        
        Paramètres :
        - participant_id : ID in-game du joueur.
        - opp_id : ID in-game de l'adversaire direct.
        - timeline_data : Dictionnaire des événements temporels Riot.
        - game_duration : Durée totale de la partie en secondes.
        
        Retourne :
        Un dictionnaire contenant les données du graphe et les moyennes de nettoyage.
        """
        events = []
        if timeline_data and "info" in timeline_data:
            for frame in timeline_data["info"].get("frames", []):
                events.extend(frame.get("events", []))
                
        events.sort(key=lambda x: x.get("timestamp", 0))

        timeline_graph = [{"timestamp": 0, "playerWardsKilled": 0, "oppWardsKilled": 0}]
        p_killed = 0
        o_killed = 0
        
        player_pre_objective_clears = 0
        opp_pre_objective_clears = 0
        
        elite_monster_kills = [e for e in events if e.get("type") == "ELITE_MONSTER_KILL"]

        for event in events:
            e_type = event.get("type")
            ts = event.get("timestamp", 0)

            if e_type == "WARD_KILL":
                killer = event.get("killerId")
                if killer == participant_id:
                    p_killed += 1
                    timeline_graph.append({"timestamp": ts, "playerWardsKilled": p_killed, "oppWardsKilled": o_killed})
                    for obj in elite_monster_kills:
                        obj_ts = obj.get("timestamp", 0)
                        if obj_ts - 60000 <= ts <= obj_ts:
                            player_pre_objective_clears += 1
                            break
                            
                elif killer == opp_id:
                    o_killed += 1
                    timeline_graph.append({"timestamp": ts, "playerWardsKilled": p_killed, "oppWardsKilled": o_killed})
                    for obj in elite_monster_kills:
                        obj_ts = obj.get("timestamp", 0)
                        if obj_ts - 60000 <= ts <= obj_ts:
                            opp_pre_objective_clears += 1
                            break

        final_ts = game_duration * 1000
        timeline_graph.append({"timestamp": final_ts, "playerWardsKilled": p_killed, "oppWardsKilled": o_killed})

        total_objectives = len(elite_monster_kills)
        avg_player_clears = round(player_pre_objective_clears / total_objectives, 1) if total_objectives > 0 else 0
        avg_opp_clears = round(opp_pre_objective_clears / total_objectives, 1) if total_objectives > 0 else 0

        return {
            "graph_data": timeline_graph,
            "avg_player_pre_objective_clears": avg_player_clears,
            "avg_opp_pre_objective_clears": avg_opp_clears,
        }

    def compute(self, participant: Dict[str, Any], match_data: Dict[str, Any], timeline_data: Dict[str, Any] = None, opponent: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Assemble les statistiques de vision brutes et temporelles pour former 
        le dictionnaire exact attendu par l'onglet Vision Denial du frontend.
        """
        c = participant.get("challenges", {})
        o_c = opponent.get("challenges", {}) if opponent else {}
        
        game_duration = match_data.get("info", {}).get("gameDuration", 0)
        participant_id = participant.get("participantId")
        opp_id = opponent.get("participantId") if opponent else None
        
        timeline_vision = self._process_blackout_timeline(participant_id, opp_id, timeline_data, game_duration)
        
        return {
            "visionScore": participant.get("visionScore", 0),
            "visionScoreOpponent": opponent.get("visionScore", 0) if opponent else 0,
            "visionScorePerMinute": c.get("visionScorePerMinute", 0),
            "visionScorePerMinuteOpponent": o_c.get("visionScorePerMinute", 0) if opponent else 0,
            "visionScoreAdvantage": c.get("visionScoreAdvantageLaneOpponent", 0),
            "visionScoreAdvantageOpponent": o_c.get("visionScoreAdvantageLaneOpponent", 0) if opponent else 0,
            "controlWardCoverage": c.get("controlWardTimeCoverageInRiverOrEnemyHalf", 0),
            "controlWardCoverageOpponent": o_c.get("controlWardTimeCoverageInRiverOrEnemyHalf", 0) if opponent else 0,
            "wardTakedownsBefore20M": c.get("wardTakedownsBefore20M", 0),
            "wardTakedownsBefore20MOpponent": o_c.get("wardTakedownsBefore20M", 0) if opponent else 0,
            "twoWardsOneSweeperCount": c.get("twoWardsOneSweeperCount", 0),
            "twoWardsOneSweeperCountOpponent": o_c.get("twoWardsOneSweeperCount", 0) if opponent else 0,
            "controlWardsBought": participant.get("visionWardsBoughtInGame", 0),
            "controlWardsBoughtOpponent": opponent.get("visionWardsBoughtInGame", 0) if opponent else 0,
            "stealthWardsPlaced": c.get("stealthWardsPlaced", 0),
            "stealthWardsPlacedOpponent": o_c.get("stealthWardsPlaced", 0) if opponent else 0,
            "detectorWardsPlaced": participant.get("detectorWardsPlaced", 0),
            "detectorWardsPlacedOpponent": opponent.get("detectorWardsPlaced", 0) if opponent else 0,
            "wardsKilled": participant.get("wardsKilled", 0),
            "wardsKilledOpponent": opponent.get("wardsKilled", 0) if opponent else 0,
            "preObjectiveClears": timeline_vision["avg_player_pre_objective_clears"],
            "preObjectiveClearsOpponent": timeline_vision["avg_opp_pre_objective_clears"],
            "timelineGraph": {"events": timeline_vision["graph_data"]}
        }