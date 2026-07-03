"""
===============================================================================
FICHIER : backend/app/services/analysis/modules/agency/support_agency.py
PROJET  : JungleDiff

DESCRIPTION :
Module expert gérant l'extraction des statistiques d'Agency (Impact, Présence, 
Rythme) pour le rôle de Support. 
Identifie la capacité du joueur à dominer sa phase de lane, à initier le 
rythme en early game (First Blood, Kills <15m) et à impacter le reste de la 
carte (Roaming).
===============================================================================
"""

from typing import Dict, Any
from app.services.analysis.modules.base_module import BaseMetricModule

class SupportAgencyModule(BaseMetricModule):

    def compute(self, participant: Dict[str, Any], match_data: Dict[str, Any], timeline_data: Dict[str, Any] = None, opponent: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Assemble les métriques d'Agency pour le Support.
        Extrait les données booléennes et les compteurs depuis la racine du 
        participant et le noeud des challenges.
        """
        c = participant.get("challenges", {})
        o_c = opponent.get("challenges", {}) if opponent else {}

        # Conversion des booléens First Blood en entiers (1/0) pour l'affichage stat
        fb_part = 1 if (participant.get("firstBloodKill") or participant.get("firstBloodAssist")) else 0
        fb_part_opp = 1 if opponent and (opponent.get("firstBloodKill") or opponent.get("firstBloodAssist")) else 0

        return {
            # 1. Rythme Initial
            "firstBloodParticipation": fb_part,
            "firstBloodParticipationOpponent": fb_part_opp,
            "takedownsFirstXMinutes": c.get("takedownsFirstXMinutes", 0),
            "takedownsFirstXMinutesOpponent": o_c.get("takedownsFirstXMinutes", 0) if opponent else 0,
            
            # 2. Domination de Lane
            "laningPhaseGoldExpAdvantage": c.get("laningPhaseGoldExpAdvantage", 0),
            "laningPhaseGoldExpAdvantageOpponent": o_c.get("laningPhaseGoldExpAdvantage", 0) if opponent else 0,
            "earlyLaningPhaseGoldExpAdvantage": c.get("earlyLaningPhaseGoldExpAdvantage", 0),
            "earlyLaningPhaseGoldExpAdvantageOpponent": o_c.get("earlyLaningPhaseGoldExpAdvantage", 0) if opponent else 0,

            # 3. Pression Globale et Clutch
            "killsOnOtherLanesEarlyJungleAsLaner": c.get("killsOnOtherLanesEarlyJungleAsLaner", 0),
            "killsOnOtherLanesEarlyJungleAsLanerOpponent": o_c.get("killsOnOtherLanesEarlyJungleAsLaner", 0) if opponent else 0,
            "outnumberedKills": c.get("outnumberedKills", 0),
            "outnumberedKillsOpponent": o_c.get("outnumberedKills", 0) if opponent else 0,
            "saveAllyFromDeath": c.get("saveAllyFromDeath", 0),
            "saveAllyFromDeathOpponent": o_c.get("saveAllyFromDeath", 0) if opponent else 0
        }