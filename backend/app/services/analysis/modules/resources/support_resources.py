"""
===============================================================================
FICHIER : backend/app/services/analysis/modules/resources/support_resources.py
PROJET  : JungleDiff

DESCRIPTION :
Module expert gérant l'extraction et le calcul des statistiques économiques 
pour le rôle de Support. 
Calcule de manière agnostique la Taxe de Lane (CS volés), le Budget Vision 
(part du salaire investi dans les wards) et génère les 3 indices de ROI 
(Return on Investment) pour permettre au frontend de piocher celui qui 
correspond à son archétype.
===============================================================================
"""

from typing import Dict, Any
from app.services.analysis.modules.base_module import BaseMetricModule

class SupportResourceModule(BaseMetricModule):

    def _calculate_roi_metrics(self, participant: Dict[str, Any], challenges: Dict[str, Any]) -> Dict[str, float]:
        """
        Calcule les indices de rentabilité (Return On Investment).
        Divise les performances absolues (Dégâts, Tanking, Soins) par l'or 
        totalement dépensé en boutique. 
        Si l'or dépensé est nul (cas de déconnexion précoce), retourne 0 pour 
        éviter les crashs de division par zéro.
        """
        gold_spent = participant.get("goldSpent", 0)
        if gold_spent <= 0:
            return {"damagePerGold": 0.0, "tankingPerGold": 0.0, "utilityPerGold": 0.0}

        dmg = participant.get("totalDamageDealtToChampions", 0)
        tanking = participant.get("damageSelfMitigated", 0)
        utility = challenges.get("effectiveHealAndShielding", 0)

        return {
            "damagePerGold": round(dmg / gold_spent, 2),
            "tankingPerGold": round(tanking / gold_spent, 2),
            "utilityPerGold": round(utility / gold_spent, 2)
        }

    def compute(self, participant: Dict[str, Any], match_data: Dict[str, Any], timeline_data: Dict[str, Any] = None, opponent: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Assemble les métriques économiques du Support.
        """
        c = participant.get("challenges", {})
        o_c = opponent.get("challenges", {}) if opponent else {}

        gold_earned = participant.get("goldEarned", 0)
        gold_earned_opp = opponent.get("goldEarned", 0) if opponent else 0

        # Calcul du budget Vision (Prix d'une Pink Ward = 75 golds)
        vision_wards = participant.get("visionWardsBoughtInGame", 0)
        vision_budget_pct = ((vision_wards * 75) / gold_earned * 100) if gold_earned > 0 else 0
        
        vision_wards_opp = opponent.get("visionWardsBoughtInGame", 0) if opponent else 0
        vision_budget_pct_opp = ((vision_wards_opp * 75) / gold_earned_opp * 100) if gold_earned_opp > 0 else 0

        roi = self._calculate_roi_metrics(participant, c)
        roi_opp = self._calculate_roi_metrics(opponent, o_c) if opponent else {"damagePerGold": 0.0, "tankingPerGold": 0.0, "utilityPerGold": 0.0}

        return {
            # Base Économique
            "goldEarned": gold_earned,
            "goldEarnedOpponent": gold_earned_opp,
            "goldPerMinute": c.get("goldPerMinute", 0),
            "goldPerMinuteOpponent": o_c.get("goldPerMinute", 0) if opponent else 0,
            
            # Taxe de Lane (Sbires touchés par erreur ou push)
            "supportTax": c.get("laneMinionsFirst10Minutes", 0),
            "supportTaxOpponent": o_c.get("laneMinionsFirst10Minutes", 0) if opponent else 0,

            # Budget Vision
            "visionBudgetPercent": round(vision_budget_pct, 1),
            "visionBudgetPercentOpponent": round(vision_budget_pct_opp, 1),

            # Les 3 indices de ROI
            "damagePerGold": roi.get("damagePerGold"),
            "damagePerGoldOpponent": roi_opp.get("damagePerGold"),
            "tankingPerGold": roi.get("tankingPerGold"),
            "tankingPerGoldOpponent": roi_opp.get("tankingPerGold"),
            "utilityPerGold": roi.get("utilityPerGold"),
            "utilityPerGoldOpponent": roi_opp.get("utilityPerGold")
        }