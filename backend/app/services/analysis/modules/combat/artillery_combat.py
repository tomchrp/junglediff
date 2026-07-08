"""
===============================================================================
FICHIER : backend/app/services/analysis/modules/combat/artillery_combat.py
PROJET  : JungleDiff
===============================================================================
"""

from typing import Dict, Any
from app.services.analysis.base_analyzer import BaseRoleAnalyzer

class ArtilleryCombatModule(BaseRoleAnalyzer):

    def analyze(self, participant: Dict[str, Any], match_data: Dict[str, Any], timeline_data: Dict[str, Any] = None, opponent: Dict[str, Any] = None) -> Dict[str, Any]:
        pass

    def _calculate_spell_efficiency(self, participant: Dict[str, Any], challenges: Dict[str, Any]) -> Dict[str, Any]:
        spell1 = participant.get("spell1Casts", 0)
        spell2 = participant.get("spell2Casts", 0)
        spell3 = participant.get("spell3Casts", 0)
        spell4 = participant.get("spell4Casts", 0)
        
        total_spells_cast = spell1 + spell2 + spell3 + spell4
        skillshots_hit = challenges.get("skillshotsHit", 0)
        
        spell_hit_ratio = 0
        if total_spells_cast > 0:
            raw_ratio = (skillshots_hit / total_spells_cast) * 100
            spell_hit_ratio = round(min(raw_ratio, 100.0), 1)
            
        return {
            "totalSpellsCast": total_spells_cast,
            "spellHitRatio": spell_hit_ratio,
            "skillshotsHit": skillshots_hit,
            "skillshotsDodged": challenges.get("skillshotsDodged", 0)
        }

    def compute(self, participant: Dict[str, Any], match_data: Dict[str, Any], timeline_data: Dict[str, Any] = None, opponent: Dict[str, Any] = None) -> Dict[str, Any]:
        c = participant.get("challenges", {})
        o_c = opponent.get("challenges", {}) if opponent else {}
        
        spell_efficiency = self._calculate_spell_efficiency(participant, c)
        spell_efficiency_opp = self._calculate_spell_efficiency(opponent, o_c) if opponent else {}
        
        # FIX : Héritage du moteur de timeline parent pour filtrer les potions
        extract_dmg_fn = lambda p: {"totalDamage": p.get("damageStats", {}).get("totalDamageDoneToChampions", 0)}
        timeline_combat = self._extract_timeline_data(participant.get("participantId"), timeline_data, extract_dmg_fn)
        
        return {
            "damageToChampions": participant.get("totalDamageDealtToChampions", 0),
            "damageToChampionsOpponent": opponent.get("totalDamageDealtToChampions", 0) if opponent else 0,
            "damagePerMinute": c.get("damagePerMinute", 0),
            "damagePerMinuteOpponent": o_c.get("damagePerMinute", 0) if opponent else 0,
            "teamDamagePercentage": c.get("teamDamagePercentage", 0),
            "teamDamagePercentageOpponent": o_c.get("teamDamagePercentage", 0) if opponent else 0,
            "killParticipation": c.get("killParticipation", 0),
            "killParticipationOpponent": o_c.get("killParticipation", 0) if opponent else 0,
            
            "totalSpellsCast": spell_efficiency.get("totalSpellsCast", 0),
            "totalSpellsCastOpponent": spell_efficiency_opp.get("totalSpellsCast", 0) if opponent else 0,
            "spellHitRatio": spell_efficiency.get("spellHitRatio", 0),
            "spellHitRatioOpponent": spell_efficiency_opp.get("spellHitRatio", 0) if opponent else 0,
            "skillshotsHit": spell_efficiency.get("skillshotsHit", 0),
            "skillshotsHitOpponent": spell_efficiency_opp.get("skillshotsHit", 0) if opponent else 0,
            "skillshotsDodged": spell_efficiency.get("skillshotsDodged", 0),
            "skillshotsDodgedOpponent": spell_efficiency_opp.get("skillshotsDodged", 0) if opponent else 0,
            "landSkillShotsEarlyGame": c.get("landSkillShotsEarlyGame", 0),
            "landSkillShotsEarlyGameOpponent": o_c.get("landSkillShotsEarlyGame", 0) if opponent else 0,
            
            "tookLargeDamageSurvived": c.get("tookLargeDamageSurvived", 0),
            "tookLargeDamageSurvivedOpponent": o_c.get("tookLargeDamageSurvived", 0) if opponent else 0,
            "longestTimeSpentLiving": c.get("longestTimeSpentLiving", 0),
            "longestTimeSpentLivingOpponent": o_c.get("longestTimeSpentLiving", 0) if opponent else 0,
            
            "timelineGraph": timeline_combat
        }