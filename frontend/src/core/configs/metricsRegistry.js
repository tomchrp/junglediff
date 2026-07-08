/**
 * ============================================================================
 * FICHIER : frontend/src/core/configs/metricsRegistry.js
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Source Unique de Vérité (Single Source of Truth) pour toutes les métriques
 * métiers affichées dans l'application. 
 *
 * MODIFICATIONS (JUNGLE PATHING) :
 * - Ajout de la constante EARLY_PATHING.
 * - Association avec la clé backend 'earlyPathing' et le widget par défaut
 * 'JunglePathingMap' pour le rendu dynamique sans hardcoding.
 * ============================================================================
 */

export const METRICS = {
    // ==========================================
    // VISION : IMPACT ET CONTROLE
    // ==========================================
    VISION_SCORE: { valueKey: 'visionScore', defaultLabel: 'Score Global', defaultWidget: 'StatCardMain', format: 'number', description: 'Impact brut de la vision', defaultFooter: { label: 'Ratio / min :', valueKey: 'visionScorePerMinute', format: 'number_one_decimal' } },
    VISION_PENETRATION: { valueKey: 'controlWardCoverage', defaultLabel: 'Pénétration de Vision', defaultWidget: 'CircularGauge', color: 'text-lol-info' },
    TEAM_VISION_SHARE: { valueKey: 'teamVisionShare', defaultLabel: "Part de l'équipe", defaultWidget: 'CircularGauge', color: 'text-lol-info' },
    SUPPORT_QUEST_TIME: { valueKey: 'playerQuestTime', opponentValueKey: 'oppQuestTime', defaultLabel: 'Quête Support', defaultWidget: 'StatCardSimple', format: 'time_milliseconds', polarity: 'negative', description: "Timer d'obtention des balises" },
    PRE_OBJECTIVE_WARDS: { valueKey: 'avgPreObjectiveWards', defaultLabel: 'Setup Objectifs Neutres', defaultWidget: 'StatCardSimple', format: 'number_one_decimal', description: "Wards posées 60s avant la mort d'un monstre épique." },
    PRE_OBJECTIVE_CLEARS: { valueKey: 'preObjectiveClears', opponentValueKey: 'preObjectiveClearsOpponent', defaultLabel: 'Setup Objectifs Neutres', defaultWidget: 'StatCardSimple', format: 'number_one_decimal', description: "Wards nettoyées 60s avant la mort d'un monstre épique." },
    WARDS_PLACED: { valueKey: 'wardsPlaced', defaultLabel: 'Balises posées', color: 'text-gray-100' },
    STEALTH_WARDS_PLACED: { valueKey: 'stealthWardsPlaced', defaultLabel: 'Balises jaunes posées', color: 'text-gray-100' },
    WARDS_KILLED: { valueKey: 'wardsKilled', defaultLabel: 'Balises détruites', color: 'text-gray-100' },
    CONTROL_WARDS_BOUGHT: { valueKey: 'controlWardsBought', defaultLabel: 'Balises Contrôle achetées', color: 'text-pink-400' },
    SWEEPER_TAKEDOWNS_EARLY: { valueKey: 'wardTakedownsBefore20M', defaultLabel: 'Wards détruites (<20m)', color: 'text-lol-info' },
    SWEEPER_RENTABILITY: { valueKey: 'twoWardsOneSweeperCount', defaultLabel: 'Sweeper rentabilisé (2+ wards)', color: 'text-lol-gold' },

    // ==========================================
    // COMBAT : DEGATS ET PARTICIPATION
    // ==========================================
    DAMAGE_TO_CHAMPIONS: { valueKey: 'damageToChampions', defaultLabel: 'Dégâts aux Champions', defaultWidget: 'StatCardMain', format: 'number', defaultFooter: { label: 'Ratio / min :', valueKey: 'damagePerMinute', format: 'number_zero_decimal' } },
    DAMAGE_MITIGATED: { valueKey: 'damageSelfMitigated', defaultLabel: 'Absorption des dégâts', defaultWidget: 'StatCardMain', format: 'number', defaultFooter: { label: 'Post-mitigation :', valueKey: 'totalDamageTaken', format: 'number' } },
    KILL_PARTICIPATION: { valueKey: 'killParticipation', defaultLabel: 'Participation (KP)', defaultWidget: 'CircularGauge', color: 'text-lol-info' },
    TEAM_DAMAGE_SHARE: { valueKey: 'teamDamagePercentage', defaultLabel: 'Poids Offensif (%)', defaultWidget: 'CircularGauge', color: 'text-lol-info' },
    TEAM_DEFENSE_SHARE: { valueKey: 'damageTakenOnTeamPercentage', defaultLabel: 'Poids Défensif (%)', defaultWidget: 'CircularGauge', color: 'text-lol-info' },
    EARLY_GANKS: { valueKey: 'earlyGanks', defaultLabel: 'Ganks Réussis (<10m)', defaultWidget: 'StatCardSimple', format: 'number' },

    // ==========================================
    // COMBAT : MECANIQUES ET UTILITE
    // ==========================================
    TIME_CCING_OTHERS: { valueKey: 'timeCCingOthers', defaultLabel: 'Durée de Contrôle', defaultWidget: 'StatCardSimple', format: 'time_seconds' },
    CC_TIME: { valueKey: 'ccTime', defaultLabel: 'Temps CC (s)', color: 'text-gray-100' },
    CONTESTED_KILLS: { valueKey: 'contestedKills', defaultLabel: 'Kills Contestés', color: 'text-gray-100' },
    SKILLSHOTS_EARLY: { valueKey: 'landSkillShotsEarlyGame', defaultLabel: 'Harcèlement (Avant 14m)', defaultWidget: 'StatCardSimple', format: 'number' },
    SKILLSHOTS_HIT: { valueKey: 'skillshotsHit', defaultLabel: 'Sorts touchés', color: 'text-lol-info' },
    SKILLSHOTS_DODGED: { valueKey: 'skillshotsDodged', defaultLabel: 'Sorts esquivés', color: 'text-gray-100' },
    TOTAL_SPELLS_CAST: { valueKey: 'totalSpellsCast', defaultLabel: 'Sorts lancés (Total)', format: 'number', color: 'text-gray-100' },
    SPELL_HIT_RATIO: { valueKey: 'spellHitRatio', defaultLabel: 'Précision globale', format: 'percentage', color: 'text-lol-info' },
    SURVIVABILITY_TIME: { valueKey: 'longestTimeSpentLiving', defaultLabel: 'Positionnement & Sécurité', defaultWidget: 'StatCardSimple', format: 'time_seconds' },
    ENEMY_IMMOBILIZATIONS: { valueKey: 'enemyChampionImmobilizations', defaultLabel: 'Immobilisations', color: 'text-lol-info' },
    IMMOBILIZE_AND_KILL: { valueKey: 'immobilizeAndKillWithAlly', defaultLabel: 'Aides létales sous contrôle', color: 'text-gray-100' },
    SURVIVED_BURSTS: { valueKey: 'tookLargeDamageSurvived', defaultLabel: 'Survies aux Bursts', defaultWidget: 'StatCardSimple', format: 'number' },

    // ==========================================
    // OBJECTIFS (JUNGLE)
    // ==========================================
    SCUTTLES: { valueKey: 'scuttles', defaultLabel: 'Rivière (Carapateurs)', defaultWidget: 'StatCardSimple', format: 'number' },
    EPIC_STEALS: { valueKey: 'epicSteals', defaultLabel: 'Vols Épiques', defaultWidget: 'StatCardSimple', format: 'number' },
    EARLY_OBJECTIVES: { valueKey: 'earlyObjectives', defaultLabel: 'Early (Héraut/Grubs)', defaultWidget: 'StatCardSimple', format: 'number' },
    DAMAGE_TO_EPIC: { valueKey: 'damageToEpic', defaultLabel: 'Dégâts aux Épiques', defaultWidget: 'StatCardSimple', format: 'number' },
    DRAGON_KILLS: { valueKey: 'dragonKills', defaultLabel: 'Smites Dragons', defaultWidget: 'StatCardSimple', format: 'number' },
    BARON_KILLS: { valueKey: 'baronKills', defaultLabel: 'Smites Barons', defaultWidget: 'StatCardSimple', format: 'number' },

    // ==========================================
    // SPATIALISATION ET PATHING
    // ==========================================
    EARLY_PATHING: { valueKey: 'earlyPathing', defaultLabel: 'Premier Clear', defaultWidget: 'JunglePathingMap' },

    // ==========================================
    // OBJECTIFS (LANERS / SUPPORTS)
    // ==========================================
    TURRET_DAMAGE: { valueKey: 'damageDealtToBuildings', defaultLabel: 'Dégâts aux Tourelles', defaultWidget: 'StatCardMain', format: 'number' },
    TURRET_PLATES: { valueKey: 'turretPlatesTaken', defaultLabel: 'Plaques récupérées', defaultWidget: 'StatCardSimple', format: 'number' },
    FIRST_TOWER_PARTICIPATION: { valueKey: 'firstTowerParticipation', defaultLabel: 'Course à la 1ère Tour', defaultWidget: 'StatCardSimple', format: 'number', description: 'Assistance ou Destruction de la première tour' },
    BOT_TOWER_FALL_TIME: { valueKey: 'enemyBotTowerFallTime', opponentValueKey: 'enemyBotTowerFallTimeOpponent', defaultLabel: 'Chute de la T1 Adverse', defaultWidget: 'StatCardSimple', format: 'time_milliseconds', polarity: 'negative' },
    DRAGON_TAKEDOWNS: { valueKey: 'dragonTakedowns', defaultLabel: 'Dragons', color: 'text-orange-400' },
    HERALD_TAKEDOWNS: { valueKey: 'riftHeraldTakedowns', defaultLabel: 'Hérauts / Grubs', color: 'text-purple-400' },
    BARON_TAKEDOWNS: { valueKey: 'baronTakedowns', defaultLabel: 'Barons', color: 'text-lol-info' },

    // ==========================================
    // RESSOURCES ET ECONOMIE (SUPPORTS)
    // ==========================================
    SUPPORT_TAX: { valueKey: 'supportTax', defaultLabel: 'Taxe de Lane (CS <10m)', defaultWidget: 'StatCardSimple', format: 'number', polarity: 'negative', description: 'Sbires tués en phase de lane' },
    VISION_BUDGET_PERCENT: { valueKey: 'visionBudgetPercent', defaultLabel: 'Budget Vision', defaultWidget: 'StatCardSimple', format: 'percentage', color: 'text-pink-400', description: '% des golds investi en Pinks' },
    DAMAGE_PER_GOLD: { valueKey: 'damagePerGold', defaultLabel: 'Rendement Offensif', defaultWidget: 'StatCardSimple', format: 'number_one_decimal', color: 'text-lol-info', description: 'Dégâts infligés par Gold dépensé' },
    TANKING_PER_GOLD: { valueKey: 'tankingPerGold', defaultLabel: 'Rendement Défensif', defaultWidget: 'StatCardSimple', format: 'number_one_decimal', color: 'text-lol-info', description: 'Dégâts encaissés par Gold dépensé' },
    UTILITY_PER_GOLD: { valueKey: 'utilityPerGold', defaultLabel: 'Rendement Utilitaire', defaultWidget: 'StatCardSimple', format: 'number_one_decimal', color: 'text-emerald-400', description: 'Soins/Boucliers par Gold dépensé' },

    // ==========================================
    // RESSOURCES ET ECONOMIE (JUNGLE)
    // ==========================================
    ALLY_JUNGLE_CS: { valueKey: 'allyJungleCS', defaultLabel: 'Jungle Alliée', defaultWidget: 'StatCardSimple', format: 'number', description: 'Monstres tués' },
    ENEMY_JUNGLE_CS: { valueKey: 'enemyJungleCS', defaultLabel: 'Jungle Ennemie', color: 'text-lol-info' },
    BUFFS_STOLEN: { valueKey: 'buffsStolen', defaultLabel: 'Buffs Volés', color: 'text-lol-gold' },
    GOLD_EARNED: { valueKey: 'goldEarned', defaultLabel: 'Golds Générés', defaultWidget: 'StatCardSimple', format: 'number' },
    EARLY_GOLD: { valueKey: 'earlyGold', defaultLabel: 'Golds', color: 'text-lol-gold' },
    EARLY_XP: { valueKey: 'earlyXP', defaultLabel: 'Expérience (Lvl)', color: 'text-emerald-400' },

    // ==========================================
    // AGENCY ET IMPACT (GLOBAL)
    // ==========================================
    FIRST_BLOOD_PARTICIPATION: { valueKey: 'firstBloodParticipation', defaultLabel: 'Participation First Blood', defaultWidget: 'StatCardSimple', format: 'number', description: 'Assistance ou Kill sur le 1er sang' },
    EARLY_TAKEDOWNS: { valueKey: 'takedownsFirstXMinutes', defaultLabel: 'Takedowns Early (<15m)', defaultWidget: 'StatCardSimple', format: 'number', color: 'text-lol-info' },
    LANE_DOMINATION: { valueKey: 'laningPhaseGoldExpAdvantage', defaultLabel: 'Domination de Lane', defaultWidget: 'StatCardSimple', format: 'number', color: 'text-lol-gold', description: 'Avantage Gold/XP en fin de lane (1 = Oui)' },
    ROAMING_KILLS: { valueKey: 'killsOnOtherLanesEarlyJungleAsLaner', defaultLabel: 'Kills en Roaming', defaultWidget: 'StatCardSimple', format: 'number', color: 'text-purple-400', description: 'Kills pris sur d\'autres lanes en Early' },
    OUTNUMBERED_KILLS: { valueKey: 'outnumberedKills', defaultLabel: 'Kills en infériorité', defaultWidget: 'StatCardSimple', format: 'number', color: 'text-lol-loss', description: 'Éliminations réussies en désavantage numérique' },
    ALLY_SAVED: { valueKey: 'saveAllyFromDeath', defaultLabel: 'Sauvetages Critiques', defaultWidget: 'StatCardSimple', format: 'number', color: 'text-emerald-400' },

    // ==========================================
    // ANALYSE META (DUOS & SYNERGIES)
    // ==========================================
    DUO_WINRATE: { valueKey: 'duo_wr', defaultLabel: 'Winrate du Duo', format: 'percentage', color: 'text-gray-100' },
    SYNERGY_DELTA: { valueKey: 'synergy_delta', defaultLabel: 'Synergie (Delta)', defaultWidget: 'StatDelta', format: 'percentage' },
    DUO_MATCH_VOLUME: { valueKey: 'total_matches', defaultLabel: 'Volume de parties', format: 'number', color: 'text-lol-textMuted' },
};

export const TIMELINE_SERIES = {
    // Vision (On impose stepAfter pour des paliers stricts)
    PLAYER_WARDS_PLACED: { dataKey: 'playerPlaced', defaultName: 'Posées (Moi)', color: '#0ea5e9', strokeWidth: 2, showDots: true, type: 'stepAfter' },
    OPP_WARDS_PLACED: { dataKey: 'oppPlaced', defaultName: 'Posées (Adv)', color: '#ef4444', strokeWidth: 2, showDots: true, type: 'stepAfter' },
    PLAYER_WARDS_KILLED: { dataKey: 'playerKilled', defaultName: 'Détruites (Moi)', color: '#38bdf8', strokeWidth: 2, isDashed: true, showDots: true, type: 'stepAfter' },
    OPP_WARDS_KILLED: { dataKey: 'oppKilled', defaultName: 'Détruites (Adv)', color: '#f87171', strokeWidth: 2, isDashed: true, showDots: true, type: 'stepAfter' },
    PLAYER_SWEEPING: { dataKey: 'playerWardsKilled', defaultName: 'Nettoyage (Moi)', color: '#0ea5e9', strokeWidth: 2, showDots: true, type: 'stepAfter' },
    OPP_SWEEPING: { dataKey: 'oppWardsKilled', defaultName: 'Nettoyage (Adv)', color: '#ef4444', strokeWidth: 2, isDashed: true, showDots: true, type: 'stepAfter' },
    // Combat
    TREND_DAMAGE: { dataKey: 'trendDamage', defaultName: 'Tendance', color: '#666666', strokeWidth: 1, isDashed: true },
    TOTAL_DAMAGE: { dataKey: 'totalDamage', defaultName: 'Joueur', color: '#0ea5e9', strokeWidth: 3 }
};