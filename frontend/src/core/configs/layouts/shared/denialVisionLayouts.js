/**
 * ============================================================================
 * FICHIER : frontend/src/core/configs/layouts/shared/denialVisionLayouts.js
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Configuration visuelle partagée pour l'onglet Vision du rôle Jungle.
 * Refactorisée (Phase 3) : Utilise le metricsRegistry pour s'aligner sur la 
 * nomenclature officielle, éradiquant les dérives textuelles avec le Support.
 * ============================================================================
 */

import { METRICS, TIMELINE_SERIES } from '../../metricsRegistry';

export const jungleVisionLayout = [
    {
        type: 'grid',
        cols: 3,
        items: [
            { metric: METRICS.VISION_SCORE },
            { metric: METRICS.VISION_PENETRATION }, // Standardisé : le texte "Contrôle Rivière & Invade" disparaît au profit de la norme
            {
                widget: 'StatCardDouble',
                title: 'Efficacité du Brouilleur',
                row1Metric: METRICS.SWEEPER_TAKEDOWNS_EARLY,
                row2Metric: METRICS.SWEEPER_RENTABILITY
            }
        ]
    },
    {
        type: 'row',
        items: [
            {
                widget: 'AdvancedTimelineChart',
                title: 'Brouillard : Accumulation des Wards Détruites',
                dataKey: 'timelineGraph.events',
                xAxisKey: 'timestamp',
                lines: [
                    { metric: TIMELINE_SERIES.PLAYER_SWEEPING },
                    { metric: TIMELINE_SERIES.OPP_SWEEPING }
                ]
            }
        ]
    },
    {
        type: 'grid',
        cols: 2,
        items: [
            {
                widget: 'StatCardList',
                title: "L'Arsenal du Jungler",
                listItems: [
                    { metric: METRICS.CONTROL_WARDS_BOUGHT }, // S'aligne avec la modification backend faite en Phase 1.5
                    { metric: METRICS.STEALTH_WARDS_PLACED },
                    { metric: METRICS.WARDS_KILLED } // S'aligne sur le Support (Remplace "Total détruit")
                ]
            },
            { metric: METRICS.PRE_OBJECTIVE_CLEARS }
        ]
    }
];