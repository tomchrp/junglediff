/**
 * ============================================================================
 * FICHIER : frontend/src/core/configs/layouts/roles/support/artillery.js
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Configuration UI spécifique pour l'archétype ARTILLERY (Support Poke/Dégâts).
 * Définit la cartographie des données pour les onglets de l'analyse de rôle.
 * ============================================================================
 */

import { METRICS, TIMELINE_SERIES } from '../../../metricsRegistry';
import { supportVisionLayout } from '../../shared/controlVisionLayouts';

export const artilleryLayout = {
    vision: supportVisionLayout,
    combat: [
        {
            type: 'grid', cols: 3, items: [
                { metric: METRICS.DAMAGE_TO_CHAMPIONS },
                { metric: METRICS.TEAM_DAMAGE_SHARE },
                { metric: METRICS.KILL_PARTICIPATION },
                {
                    widget: 'StatCardDouble',
                    title: "Maîtrise Balistique",
                    row1Metric: METRICS.TOTAL_SPELLS_CAST,
                    row2Metric: METRICS.SPELL_HIT_RATIO
                },
                { metric: METRICS.SKILLSHOTS_EARLY },
                { metric: METRICS.SURVIVABILITY_TIME }
            ]
        },
        {
            type: 'row', items: [
                {
                    widget: 'AdvancedTimelineChart',
                    title: "Évolution de la pression offensive",
                    dataKey: 'timelineGraph.damage_graph',
                    xAxisKey: 'timestamp',
                    lines: [
                        { metric: TIMELINE_SERIES.TREND_DAMAGE, connectNulls: true, type: 'linear' },
                        { metric: TIMELINE_SERIES.TOTAL_DAMAGE, dotRenderer: 'CustomItemDot' }
                    ]
                }
            ]
        },
        {
            type: 'grid', cols: 1, items: [
                { metric: METRICS.SURVIVED_BURSTS }
            ]
        }
    ],
    objectives: [
        {
            type: 'grid', cols: 3, items: [
                { metric: METRICS.TURRET_DAMAGE },
                { metric: METRICS.TURRET_PLATES },
                { metric: METRICS.FIRST_TOWER_PARTICIPATION },
                {
                    widget: 'StatCardList',
                    title: 'Contrôle Épique (Takedowns)',
                    listItems: [
                        { metric: METRICS.DRAGON_TAKEDOWNS },
                        { metric: METRICS.HERALD_TAKEDOWNS },
                        { metric: METRICS.BARON_TAKEDOWNS }
                    ]
                },
                { metric: METRICS.BOT_TOWER_FALL_TIME },
                { metric: METRICS.PRE_OBJECTIVE_WARDS }
            ]
        }
    ],
    resources: [
        {
            type: 'grid', cols: 3, items: [
                { metric: METRICS.GOLD_EARNED },
                { metric: METRICS.VISION_BUDGET_PERCENT },
                { metric: METRICS.DAMAGE_PER_GOLD }
            ]
        },
        {
            type: 'grid', cols: 2, items: [
                { metric: METRICS.SUPPORT_TAX },
                { metric: METRICS.SUPPORT_QUEST_TIME, override: { widget: 'StatCardSimple' } }
            ]
        }
    ],
    agency: [
        {
            type: 'grid', cols: 3, items: [
                { metric: METRICS.LANE_DOMINATION },
                { metric: METRICS.FIRST_BLOOD_PARTICIPATION },
                { metric: METRICS.EARLY_TAKEDOWNS }
            ]
        },
        {
            type: 'grid', cols: 2, items: [
                { metric: METRICS.KILL_PARTICIPATION, override: { label: 'Présence Globale' } },
                { metric: METRICS.TEAM_DAMAGE_SHARE, override: { label: 'Poids Offensif Global' } }
            ]
        },
        {
            type: 'grid', cols: 2, items: [
                { metric: METRICS.ROAMING_KILLS },
                { metric: METRICS.OUTNUMBERED_KILLS }
            ]
        }
    ]
};