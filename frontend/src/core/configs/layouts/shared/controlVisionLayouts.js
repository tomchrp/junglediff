/**
 * ============================================================================
 * FICHIER : frontend/src/core/configs/layouts/shared/controlVisionLayouts.js
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Configuration visuelle partagée pour l'onglet Vision du rôle Support.
 * Refactorisée (Phase 3) : Utilise le metricsRegistry (Source Unique de Vérité) 
 * pour garantir l'uniformité sémantique avec les autres rôles.
 * ============================================================================
 */

import { METRICS, TIMELINE_SERIES } from '../../metricsRegistry';

export const supportVisionLayout = [
    {
        type: 'grid',
        cols: 3,
        items: [
            { metric: METRICS.VISION_SCORE },
            { metric: METRICS.TEAM_VISION_SHARE },
            { metric: METRICS.VISION_PENETRATION } // Standardisé : le texte "Pénétration Offensive" est écrasé par le registre central
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
                    { metric: TIMELINE_SERIES.PLAYER_WARDS_PLACED },
                    { metric: TIMELINE_SERIES.PLAYER_WARDS_KILLED },
                    { metric: TIMELINE_SERIES.OPP_WARDS_PLACED },
                    { metric: TIMELINE_SERIES.OPP_WARDS_KILLED }
                ]
            }
        ]
    },
    {
        type: 'grid',
        cols: 3,
        items: [
            { metric: METRICS.SUPPORT_QUEST_TIME },
            {
                widget: 'StatCardList',
                title: 'Détail des Balises',
                listItems: [
                    { metric: METRICS.CONTROL_WARDS_BOUGHT },
                    { metric: METRICS.WARDS_PLACED },
                    { metric: METRICS.WARDS_KILLED }
                ]
            },
            { metric: METRICS.PRE_OBJECTIVE_WARDS }
        ]
    }
];