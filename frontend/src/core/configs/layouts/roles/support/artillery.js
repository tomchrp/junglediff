/**
 * ============================================================================
 * FICHIER : frontend/src/core/configs/layouts/roles/support/artillery.js
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Configuration UI spécifique pour l'archétype ARTILLERY (Support Poke/Dégâts).
 * Définit la cartographie des données pour les onglets vision et combat.
 * ============================================================================
 */

import { supportVisionLayout } from '../../shared/controlVisionLayouts';

export const artilleryLayout = {
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
};