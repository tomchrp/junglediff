/**
 * ============================================================================
 * FICHIER : frontend/src/core/configs/roleLayouts.js
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Dictionnaire de configuration pilotant l'interface (Configuration-Driven UI).
 * Définit l'agencement visuel, les widgets à instancier et les clés de données 
 * à mapper pour chaque rôle et chaque archétype.
 * 
 * MODIFICATIONS :
 * - Ajout de la configuration JUNGLE (Archétype ASSASSIN).
 * - Utilisation de CircularGauge pour le Kill Participation afin de maintenir
 *   la cohérence visuelle avec le rôle Support.
 * ============================================================================
 */

// ==========================================================
// MAQUETTES PARTAGÉES (Évite la duplication de code)
// ==========================================================
const supportVisionLayout = [
    {
        type: 'grid',
        cols: 3,
        items: [
            {
                widget: 'StatCardMain',
                title: 'Score Global',
                mainValueKey: 'visionScore',
                mainFormat: 'number',
                footerLabel: 'Ratio :',
                footerValueKey: 'visionScorePerMinute',
                footerFormat: 'number_one_decimal',
                bottomText: 'Impact brut de la vision'
            },
            {
                widget: 'CircularGauge',
                label: "Part de l'équipe",
                valueKey: 'teamVisionShare',
                color: 'text-lol-info'
            },
            {
                widget: 'CircularGauge',
                label: 'Pénétration Offensive',
                valueKey: 'controlWardCoverage',
                color: 'text-lol-info'
            }
        ]
    },
    {
        type: 'row',
        items: [
            {
                widget: 'AdvancedTimelineChart',
                title: 'Évolution de la vision',
                dataKey: 'timelineGraph.events',
                xAxisKey: 'timestamp',
                lines: [
                    { dataKey: 'playerPlaced', name: 'Posées (Moi)', color: '#0ea5e9', strokeWidth: 2, showDots: true },
                    { dataKey: 'playerKilled', name: 'Détruites (Moi)', color: '#38bdf8', strokeWidth: 2, isDashed: true, showDots: true },
                    { dataKey: 'oppPlaced', name: 'Posées (Adv)', color: '#ef4444', strokeWidth: 2, showDots: true },
                    { dataKey: 'oppKilled', name: 'Détruites (Adv)', color: '#f87171', strokeWidth: 2, isDashed: true, showDots: true }
                ]
            }
        ]
    },
    {
        type: 'grid',
        cols: 3,
        items: [
            {
                widget: 'StatCardSimple',
                title: 'Quête Support',
                valueKey: 'playerQuestTime',
                opponentValueKey: 'oppQuestTime',
                format: 'time_milliseconds',
                polarity: 'negative',
                bottomText: "Timer d'obtention des balises"
            },
            {
                widget: 'StatCardList',
                title: 'Détail des Balises',
                listItems: [
                    { label: 'Pinks achetées', valueKey: 'controlWardsBought', color: 'text-pink-400' },
                    { label: 'Balises posées', valueKey: 'wardsPlaced', color: 'text-gray-100' },
                    { label: 'Balises détruites', valueKey: 'wardsKilled', color: 'text-gray-100' }
                ]
            },
            {
                widget: 'StatCardSimple',
                title: 'Setup Objectifs Neutres',
                valueKey: 'avgPreObjectiveWards',
                format: 'number_one_decimal',
                bottomText: "Wards posées 60s avant la mort d'un monstre épique."
            }
        ]
    }
];

// ==========================================================
// EXPORT PRINCIPAL DU DICTIONNAIRE
// ==========================================================
export const roleLayouts = {
    SUPPORT: {
        VANGUARD: {
            vision: supportVisionLayout,
            combat: [
                {
                    type: 'grid',
                    cols: 3,
                    items: [
                        { widget: 'StatCardMain', title: 'Absorption des dégâts', mainValueKey: 'damageSelfMitigated', mainFormat: 'number', mainTooltip: 'Dégâts mitigés', footerLabel: 'Post-mitigation :', footerValueKey: 'totalDamageTaken', footerFormat: 'number' },
                        { widget: 'CircularGauge', label: 'Poids Défensif (%)', valueKey: 'damageTakenOnTeamPercentage', color: 'text-lol-info' },
                        { widget: 'CircularGauge', label: 'Participation aux éliminations (%)', valueKey: 'killParticipation', color: 'text-lol-info' }
                    ]
                },
                {
                    type: 'row',
                    items: [
                        {
                            widget: 'AdvancedTimelineChart', title: "Évolution de l'encaissement", dataKey: 'timelineGraph.damage_graph', xAxisKey: 'timestamp', lines: [
                                { dataKey: 'trendDamage', name: 'Tendance DPM', color: '#666666', strokeWidth: 1, isDashed: true, connectNulls: true, type: 'linear' },
                                { dataKey: 'totalDamage', name: 'Joueur', color: '#0ea5e9', strokeWidth: 3, dotRenderer: 'CustomItemDot' }
                            ]
                        }
                    ]
                },
                {
                    type: 'grid',
                    cols: 3,
                    items: [
                        { widget: 'StatCardSimple', title: 'Durée de Contrôle', valueKey: 'timeCCingOthers', format: 'time_seconds' },
                        { widget: 'StatCardDouble', title: "Qualité d'Engagement", row1Label: 'Immobilisations', row1ValueKey: 'enemyChampionImmobilizations', row1Color: 'text-lol-info', row2Label: 'Aides létales sous contrôle', row2ValueKey: 'immobilizeAndKillWithAlly', row2Color: 'text-gray-100' },
                        { widget: 'StatCardSimple', title: 'Survies aux Bursts', valueKey: 'tookLargeDamageSurvived', format: 'number' }
                    ]
                }
            ]
        },
        ARTILLERY: {
            vision: supportVisionLayout,
            combat: [
                {
                    type: 'grid',
                    cols: 3,
                    items: [
                        { widget: 'StatCardMain', title: 'Dégâts aux Champions', mainValueKey: 'damageToChampions', mainFormat: 'number', footerLabel: 'Ratio par minute :', footerValueKey: 'damagePerMinute', footerFormat: 'number_zero_decimal' },
                        { widget: 'CircularGauge', label: 'Poids Offensif (%)', valueKey: 'teamDamagePercentage', color: 'text-lol-info' },
                        { widget: 'CircularGauge', label: 'Participation aux éliminations (%)', valueKey: 'killParticipation', color: 'text-lol-info' }
                    ]
                },
                {
                    type: 'row',
                    items: [
                        {
                            widget: 'AdvancedTimelineChart', title: "Évolution de la pression offensive", dataKey: 'timelineGraph.damage_graph', xAxisKey: 'timestamp', lines: [
                                { dataKey: 'trendDamage', name: 'Tendance DPM', color: '#666666', strokeWidth: 1, isDashed: true, connectNulls: true, type: 'linear' },
                                { dataKey: 'totalDamage', name: 'Joueur', color: '#0ea5e9', strokeWidth: 3, dotRenderer: 'CustomItemDot' }
                            ]
                        }
                    ]
                },
                {
                    type: 'grid',
                    cols: 3,
                    items: [
                        { widget: 'StatCardSimple', title: 'Harcèlement (Avant 14m)', valueKey: 'landSkillShotsEarlyGame', format: 'number' },
                        { widget: 'StatCardDouble', title: "Maîtrise Balistique", row1Label: 'Sorts touchés', row1ValueKey: 'skillshotsHit', row1Color: 'text-lol-info', row2Label: 'Sorts esquivés', row2ValueKey: 'skillshotsDodged', row2Color: 'text-gray-100' },
                        { widget: 'StatCardSimple', title: 'Positionnement & Sécurité', valueKey: 'longestTimeSpentLiving', format: 'time_milliseconds' }
                    ]
                }
            ]
        }
    },
    JUNGLE: {
        ASSASSIN: {
            combat: [
                {
                    type: 'grid', cols: 4, items: [
                        { widget: 'StatCardMain', title: 'Dégâts aux Champions', mainValueKey: 'damageToChampions', mainFormat: 'number', footerLabel: 'Ratio / min :', footerValueKey: 'damagePerMinute', footerFormat: 'number_zero_decimal' },
                        { widget: 'CircularGauge', label: 'Participation (KP)', valueKey: 'killParticipation', color: 'text-lol-info' },
                        { widget: 'StatCardSimple', title: 'Ganks Réussis (<10m)', valueKey: 'earlyGanks', format: 'number' },
                        { widget: 'StatCardDouble', title: 'Utilité au Combat', row1Label: 'Temps CC (s)', row1ValueKey: 'ccTime', row1Color: 'text-gray-100', row2Label: 'Kills Contestés', row2ValueKey: 'contestedKills', row2Color: 'text-gray-100' }
                    ]
                }
            ],
            objectives: [
                {
                    type: 'grid', cols: 4, items: [
                        { widget: 'StatCardSimple', title: 'Rivière (Carapateurs)', valueKey: 'scuttles', format: 'number' },
                        { widget: 'StatCardSimple', title: 'Vols Épiques', valueKey: 'epicSteals', format: 'number' },
                        { widget: 'StatCardSimple', title: 'Early (Héraut/Grubs)', valueKey: 'earlyObjectives', format: 'number' },
                        { widget: 'StatCardSimple', title: 'Dégâts aux Épiques', valueKey: 'damageToEpic', format: 'number' }
                    ]
                },
                {
                    type: 'grid', cols: 2, items: [
                        { widget: 'StatCardSimple', title: 'Smites Dragons', valueKey: 'dragonKills', format: 'number' },
                        { widget: 'StatCardSimple', title: 'Smites Barons', valueKey: 'baronKills', format: 'number' }
                    ]
                }
            ],
            resources: [
                {
                    type: 'grid', cols: 4, items: [
                        { widget: 'StatCardSimple', title: 'Jungle Alliée', valueKey: 'allyJungleCS', format: 'number', bottomText: 'Monstres tués' },
                        { widget: 'StatCardDouble', title: 'Invasion', row1Label: 'Jungle Ennemie', row1ValueKey: 'enemyJungleCS', row1Color: 'text-lol-info', row2Label: 'Buffs Volés', row2ValueKey: 'buffsStolen', row2Color: 'text-lol-gold' },
                        { widget: 'StatCardSimple', title: 'Golds Générés', valueKey: 'goldEarned', format: 'number' },
                        { widget: 'StatCardDouble', title: 'Rythme (<10m)', row1Label: 'Golds', row1ValueKey: 'earlyGold', row1Color: 'text-lol-gold', row2Label: 'Expérience (Lvl)', row2ValueKey: 'earlyXP', row2Color: 'text-emerald-400' }
                    ]
                }
            ],
            vision: [
                {
                    type: 'grid', cols: 3, items: [
                        { widget: 'StatCardMain', title: 'Score Global', mainValueKey: 'visionScore', mainFormat: 'number', footerLabel: 'Ratio / min :', footerValueKey: 'visionPerMinute', footerFormat: 'number_one_decimal' },
                        {
                            widget: 'StatCardList', title: 'Wards Posées', listItems: [
                                { label: 'Pinks', valueKey: 'pinkWards', color: 'text-pink-400' },
                                { label: 'Balises Contrôle', valueKey: 'detectorWards', color: 'text-gray-100' },
                                { label: 'Balises Invisibles', valueKey: 'stealthWards', color: 'text-gray-100' }
                            ]
                        },
                        { widget: 'StatCardDouble', title: 'Wards Détruites', row1Label: 'Total', row1ValueKey: 'wardsKilled', row1Color: 'text-gray-100', row2Label: 'Avant 20m', row2ValueKey: 'wardsKilledBefore20', row2Color: 'text-gray-100' }
                    ]
                }
            ]
        }
    }
};