# Dictionnaire des Métriques (JungleDiff)

> **Document auto-généré.** Ce fichier est la référence absolue (Single Source of Truth) pour la création de nouveaux layouts d'analyse de rôles.
> **Directive IA :** Tu dois impérativement utiliser les constantes `METRICS.X` ou `TIMELINE_SERIES.X` répertoriées ci-dessous. Interdiction d'inventer des clés non documentées.

## 1. Métriques Générales (METRICS)

| Constante | Clé Backend | Label par défaut | Widget par défaut |
|---|---|---|---|
| `METRICS.VISION_SCORE` | `visionScore` | Score Global | StatCardMain |
| `METRICS.VISION_PENETRATION` | `controlWardCoverage` | Pénétration de Vision | CircularGauge |
| `METRICS.TEAM_VISION_SHARE` | `teamVisionShare` | Part de l'équipe | CircularGauge |
| `METRICS.SUPPORT_QUEST_TIME` | `playerQuestTime` | Quête Support | StatCardSimple |
| `METRICS.PRE_OBJECTIVE_WARDS` | `avgPreObjectiveWards` | Setup Objectifs Neutres | StatCardSimple |
| `METRICS.PRE_OBJECTIVE_CLEARS` | `preObjectiveClears` | Setup Objectifs Neutres | StatCardSimple |
| `METRICS.WARDS_PLACED` | `wardsPlaced` | Balises posées | N/A |
| `METRICS.STEALTH_WARDS_PLACED` | `stealthWardsPlaced` | Balises jaunes posées | N/A |
| `METRICS.WARDS_KILLED` | `wardsKilled` | Balises détruites | N/A |
| `METRICS.CONTROL_WARDS_BOUGHT` | `controlWardsBought` | Balises Contrôle achetées | N/A |
| `METRICS.SWEEPER_TAKEDOWNS_EARLY` | `wardTakedownsBefore20M` | Wards détruites (<20m) | N/A |
| `METRICS.SWEEPER_RENTABILITY` | `twoWardsOneSweeperCount` | Sweeper rentabilisé (2+ wards) | N/A |
| `METRICS.DAMAGE_TO_CHAMPIONS` | `damageToChampions` | Dégâts aux Champions | StatCardMain |
| `METRICS.DAMAGE_MITIGATED` | `damageSelfMitigated` | Absorption des dégâts | StatCardMain |
| `METRICS.KILL_PARTICIPATION` | `killParticipation` | Participation (KP) | CircularGauge |
| `METRICS.TEAM_DAMAGE_SHARE` | `teamDamagePercentage` | Poids Offensif (%) | CircularGauge |
| `METRICS.TEAM_DEFENSE_SHARE` | `damageTakenOnTeamPercentage` | Poids Défensif (%) | CircularGauge |
| `METRICS.EARLY_GANKS` | `earlyGanks` | Ganks Réussis (<10m) | StatCardSimple |
| `METRICS.TIME_CCING_OTHERS` | `timeCCingOthers` | Durée de Contrôle | StatCardSimple |
| `METRICS.CC_TIME` | `ccTime` | Temps CC (s) | N/A |
| `METRICS.CONTESTED_KILLS` | `contestedKills` | Kills Contestés | N/A |
| `METRICS.SKILLSHOTS_EARLY` | `landSkillShotsEarlyGame` | Harcèlement (Avant 14m) | StatCardSimple |
| `METRICS.SKILLSHOTS_HIT` | `skillshotsHit` | Sorts touchés | N/A |
| `METRICS.SKILLSHOTS_DODGED` | `skillshotsDodged` | Sorts esquivés | N/A |
| `METRICS.TOTAL_SPELLS_CAST` | `totalSpellsCast` | Sorts lancés (Total) | N/A |
| `METRICS.SPELL_HIT_RATIO` | `spellHitRatio` | Précision globale | N/A |
| `METRICS.SURVIVABILITY_TIME` | `longestTimeSpentLiving` | Positionnement & Sécurité | StatCardSimple |
| `METRICS.ENEMY_IMMOBILIZATIONS` | `enemyChampionImmobilizations` | Immobilisations | N/A |
| `METRICS.IMMOBILIZE_AND_KILL` | `immobilizeAndKillWithAlly` | Aides létales sous contrôle | N/A |
| `METRICS.SURVIVED_BURSTS` | `tookLargeDamageSurvived` | Survies aux Bursts | StatCardSimple |
| `METRICS.SCUTTLES` | `scuttles` | Rivière (Carapateurs) | StatCardSimple |
| `METRICS.EPIC_STEALS` | `epicSteals` | Vols Épiques | StatCardSimple |
| `METRICS.EARLY_OBJECTIVES` | `earlyObjectives` | Early (Héraut/Grubs) | StatCardSimple |
| `METRICS.DAMAGE_TO_EPIC` | `damageToEpic` | Dégâts aux Épiques | StatCardSimple |
| `METRICS.DRAGON_KILLS` | `dragonKills` | Smites Dragons | StatCardSimple |
| `METRICS.BARON_KILLS` | `baronKills` | Smites Barons | StatCardSimple |
| `METRICS.EARLY_PATHING` | `earlyPathing` | Premier Clear | JunglePathingMap |
| `METRICS.TURRET_DAMAGE` | `damageDealtToBuildings` | Dégâts aux Tourelles | StatCardMain |
| `METRICS.TURRET_PLATES` | `turretPlatesTaken` | Plaques récupérées | StatCardSimple |
| `METRICS.FIRST_TOWER_PARTICIPATION` | `firstTowerParticipation` | Course à la 1ère Tour | StatCardSimple |
| `METRICS.BOT_TOWER_FALL_TIME` | `enemyBotTowerFallTime` | Chute de la T1 Adverse | StatCardSimple |
| `METRICS.DRAGON_TAKEDOWNS` | `dragonTakedowns` | Dragons | N/A |
| `METRICS.HERALD_TAKEDOWNS` | `riftHeraldTakedowns` | Hérauts / Grubs | N/A |
| `METRICS.BARON_TAKEDOWNS` | `baronTakedowns` | Barons | N/A |
| `METRICS.SUPPORT_TAX` | `supportTax` | Taxe de Lane (CS <10m) | StatCardSimple |
| `METRICS.VISION_BUDGET_PERCENT` | `visionBudgetPercent` | Budget Vision | StatCardSimple |
| `METRICS.DAMAGE_PER_GOLD` | `damagePerGold` | Rendement Offensif | StatCardSimple |
| `METRICS.TANKING_PER_GOLD` | `tankingPerGold` | Rendement Défensif | StatCardSimple |
| `METRICS.UTILITY_PER_GOLD` | `utilityPerGold` | Rendement Utilitaire | StatCardSimple |
| `METRICS.ALLY_JUNGLE_CS` | `allyJungleCS` | Jungle Alliée | StatCardSimple |
| `METRICS.ENEMY_JUNGLE_CS` | `enemyJungleCS` | Jungle Ennemie | N/A |
| `METRICS.BUFFS_STOLEN` | `buffsStolen` | Buffs Volés | N/A |
| `METRICS.GOLD_EARNED` | `goldEarned` | Golds Générés | StatCardSimple |
| `METRICS.EARLY_GOLD` | `earlyGold` | Golds | N/A |
| `METRICS.EARLY_XP` | `earlyXP` | Expérience (Lvl) | N/A |
| `METRICS.FIRST_BLOOD_PARTICIPATION` | `firstBloodParticipation` | Participation First Blood | StatCardSimple |
| `METRICS.EARLY_TAKEDOWNS` | `takedownsFirstXMinutes` | Takedowns Early (<15m) | StatCardSimple |
| `METRICS.LANE_DOMINATION` | `laningPhaseGoldExpAdvantage` | Domination de Lane | StatCardSimple |
| `METRICS.ROAMING_KILLS` | `killsOnOtherLanesEarlyJungleAsLaner` | Kills en Roaming | StatCardSimple |
| `METRICS.OUTNUMBERED_KILLS` | `outnumberedKills` | Kills en infériorité | StatCardSimple |
| `METRICS.ALLY_SAVED` | `saveAllyFromDeath` | Sauvetages Critiques | StatCardSimple |
| `METRICS.DUO_WINRATE` | `duo_wr` | Winrate du Duo | N/A |
| `METRICS.SYNERGY_DELTA` | `synergy_delta` | Synergie (Delta) | StatDelta |
| `METRICS.DUO_MATCH_VOLUME` | `total_matches` | Volume de parties | N/A |

## 2. Séries Temporelles (TIMELINE_SERIES)

| Constante | Clé de Donnée (dataKey) | Nom de courbe par défaut |
|---|---|---|
| `TIMELINE_SERIES.PLAYER_WARDS_PLACED` | `playerPlaced` | Posées (Moi) |
| `TIMELINE_SERIES.OPP_WARDS_PLACED` | `oppPlaced` | Posées (Adv) |
| `TIMELINE_SERIES.PLAYER_WARDS_KILLED` | `playerKilled` | Détruites (Moi) |
| `TIMELINE_SERIES.OPP_WARDS_KILLED` | `oppKilled` | Détruites (Adv) |
| `TIMELINE_SERIES.PLAYER_SWEEPING` | `playerWardsKilled` | Nettoyage (Moi) |
| `TIMELINE_SERIES.OPP_SWEEPING` | `oppWardsKilled` | Nettoyage (Adv) |
| `TIMELINE_SERIES.TREND_DAMAGE` | `trendDamage` | Tendance |
| `TIMELINE_SERIES.TOTAL_DAMAGE` | `totalDamage` | Joueur |
