"""
===============================================================================
FICHIER : backend/app/services/analysis/jungle_analyzer.py
PROJET  : JungleDiff

DESCRIPTION :
Analyseur métier dédié au rôle de Jungler. 
Extrait, calcule et normalise les statistiques de ressources (camps de jungle, 
carapateurs), de contrôle d'objectifs (smites) et de pression sur la carte.
Remplace intégralement la logique mathématique autrefois présente dans le frontend.
===============================================================================
"""

from typing import Dict, Any
from app.services.analysis.base_analyzer import BaseRoleAnalyzer

class JungleAnalyzer(BaseRoleAnalyzer):

    def analyze(self, participant: Dict[str, Any], match_data: Dict[str, Any], timeline_data: Dict[str, Any] = None, opponent: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Génère l'empreinte complète du Jungler en calculant les métriques expertes
        (CS pur jungle, efficacité des Smites, deltas de vision) et en construisant
        le radar de performance et les insights textuels.
        """
        c = participant.get("challenges", {})
        o_c = opponent.get("challenges", {}) if opponent else {}
        
        # 1. Calculs des métriques complexes (Anciennement côté Frontend)
        ally_jungle_cs = participant.get("totalAllyJungleMinionsKilled", 0)
        enemy_jungle_cs = participant.get("totalEnemyJungleMinionsKilled", 0)
        pure_jungle_monsters_cs = ally_jungle_cs + enemy_jungle_cs
        pure_jungle_camps = pure_jungle_monsters_cs / 4
        
        scuttles = c.get("scuttleCrabKills", 0)
        
        # Smites et vols
        epic_steals = c.get("epicMonsterSteals", 0)
        pressure_smites = c.get("epicMonsterKillsNearEnemyJungler", 0)
        humiliation_steals = c.get("epicMonsterStolenWithoutSmite", 0)
        
        # 2. Normalisation Radar (Échelle 0-100)
        # TODO : Affiner les algorithmes de plafonnement pour une meilleure précision statistique
        farm_score = min(100, int((c.get("jungleCsBefore10Minutes", 0) / 60) * 100)) if opponent else 50
        vision_score = min(100, int((participant.get("visionScore", 0) / 60) * 100))
        kp_score = int(c.get("killParticipation", 0) * 100)
        objective_score = min(100, int(((participant.get("dragonKills", 0) + participant.get("baronKills", 0)) / 4) * 100))
        
        radar_data = [
            {"axe": "Farm (Early)", "scoreJoueur": farm_score, "scoreAdversaire": 50}, # Adversaire stubbé temporairement
            {"axe": "Vision", "scoreJoueur": vision_score, "scoreAdversaire": 50},
            {"axe": "Presence (KP)", "scoreJoueur": kp_score, "scoreAdversaire": int(o_c.get("killParticipation", 0) * 100) if opponent else 50},
            {"axe": "Objectifs", "scoreJoueur": objective_score, "scoreAdversaire": 50},
            {"axe": "Pression", "scoreJoueur": min(100, (c.get("killsOnLanersEarlyJungleAsJungler", 0) * 20)), "scoreAdversaire": 50}
        ]

        # 3. Génération des Insights (Narratif)
        insights = []
        if epic_steals > 0:
            insights.append({"type": "positive", "title": "Voleur", "description": f"A volé {epic_steals} monstres épiques."})
        if c.get("takedownsBeforeJungleMinionSpawn", 0) > 0:
            insights.append({"type": "positive", "title": "Invade Sanglante", "description": "Impact décisif avant l'apparition des camps."})
        if enemy_jungle_cs > (ally_jungle_cs * 0.3):
             insights.append({"type": "positive", "title": "Contre-Jungle", "description": "Forte présence dans la jungle adverse."})
        if humiliation_steals > 0:
             insights.append({"type": "negative", "title": "Humiliation", "description": "A perdu un objectif épique sans que l'adversaire n'utilise Châtiment."})

        # 4. Construction des données formatées pour les onglets (Dumb UI)
        tabs_data = {
            "resources": {
                "totalCS": participant.get("totalMinionsKilled", 0) + participant.get("neutralMinionsKilled", 0),
                "laneMinions": participant.get("totalMinionsKilled", 0),
                "pureJungleCamps": pure_jungle_camps,
                "pureJungleCS": pure_jungle_monsters_cs,
                "scuttles": scuttles,
                "allyJungleCS": ally_jungle_cs,
                "enemyJungleCS": enemy_jungle_cs,
                "buffsStolen": c.get("buffsStolen", 0),
                "goldEarned": participant.get("goldEarned", 0),
                "goldDelta": participant.get("goldEarned", 0) - opponent.get("goldEarned", 0) if opponent else 0,
                "jungleCsBefore10Minutes": c.get("jungleCsBefore10Minutes", 0)
            },
            "objectives": {
                "scuttles": scuttles,
                "initialCrabCount": c.get("initialCrabCount", 0),
                "epicSteals": epic_steals,
                "pressureSmites": pressure_smites,
                "humiliationSteals": humiliation_steals,
                "damageToEpic": participant.get("damageDealtToEpicMonsters", 0),
                "dragonKills": participant.get("dragonKills", 0),
                "baronKills": participant.get("baronKills", 0)
            },
            "combat": {
                "damageToChampions": participant.get("totalDamageDealtToChampions", 0),
                "damageDelta": participant.get("totalDamageDealtToChampions", 0) - opponent.get("totalDamageDealtToChampions", 0) if opponent else 0,
                "killParticipation": c.get("killParticipation", 0),
                "kpDelta": c.get("killParticipation", 0) - o_c.get("killParticipation", 0) if opponent else 0,
                "earlyGanks": c.get("killsOnLanersEarlyJungleAsJungler", 0),
                "ccTime": participant.get("timeCCingOthers", 0),
                "contestedKills": c.get("junglerTakedownsNearDamagedEpicMonster", 0)
            },
            "vision": {
                "visionScore": participant.get("visionScore", 0),
                "visionScoreDelta": participant.get("visionScore", 0) - opponent.get("visionScore", 0) if opponent else 0,
                "visionScoreAdvantage": c.get("visionScoreAdvantageLaneOpponent", 0),
                "visionPerMinute": c.get("visionScorePerMinute", 0),
                "pinkWards": participant.get("visionWardsBoughtInGame", 0),
                "detectorWards": participant.get("detectorWardsPlaced", 0),
                "stealthWards": participant.get("stealthWardsPlaced", 0),
                "wardsKilled": c.get("wardTakedowns", 0),
                "wardsKilledBefore20": c.get("wardTakedownsBefore20M", 0)
            }
        }

        return {
            "metadata": {"role": "JUNGLE"},
            "radar_data": radar_data,
            "insights": insights,
            "tabs_data": tabs_data
        }