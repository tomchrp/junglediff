/**
 * ============================================================================
 * FICHIER : frontend/src/core/configs/layouts/roles/support/vanguard.js
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Configuration UI spécifique pour l'archétype VANGUARD (Support d'engagement).
 * Définit la cartographie des données pour les onglets vision et combat.
 * ============================================================================
 */

import { supportVisionLayout } from '../../shared/controlVisionLayouts';

export const vanguardLayout = {
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
};