/**
 * ============================================================================
 * FICHIER : frontend/src/core/configs/layouts/shared/jungleVisionLayouts.js
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Configuration visuelle partagée pour l'onglet Vision du rôle Jungle.
 * Oriente l'analyse sur le déni de vision, l'utilisation du Brouilleur 
 * Optique (Sweeper) et le contrôle territorial avant les objectifs.
 * ============================================================================
 */

export const jungleVisionLayout = [
    {
        type: 'grid',
        cols: 3,
        items: [
            {
                widget: 'StatCardMain',
                title: 'Score Global',
                mainValueKey: 'visionScore',
                mainFormat: 'number',
                footerLabel: 'Ratio / min :',
                footerValueKey: 'visionScorePerMinute',
                footerFormat: 'number_one_decimal',
                bottomText: 'Impact brut de la vision' // Harmonisé avec le Support
            },
            {
                widget: 'CircularGauge',
                label: 'Contrôle Rivière & Invade',
                valueKey: 'controlWardCoverage',
                color: 'text-lol-info'
            },
            {
                widget: 'StatCardDouble',
                title: 'Efficacité du Brouilleur',
                row1Label: 'Wards détruites (<20m)',
                row1ValueKey: 'wardTakedownsBefore20M',
                row1Color: 'text-lol-info',
                row2Label: 'Sweeper rentabilisé (2+ wards)',
                row2ValueKey: 'twoWardsOneSweeperCount',
                row2Color: 'text-lol-gold'
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
                    { dataKey: 'playerWardsKilled', name: 'Nettoyage (Moi)', color: '#0ea5e9', strokeWidth: 2, showDots: true },
                    { dataKey: 'oppWardsKilled', name: 'Nettoyage (Adv)', color: '#ef4444', strokeWidth: 2, isDashed: true, showDots: true }
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
                    { label: 'Pinks achetées', valueKey: 'pinkWardsBought', color: 'text-pink-400' },
                    { label: 'Balises jaunes posées', valueKey: 'stealthWardsPlaced', color: 'text-gray-100' },
                    { label: 'Total détruit', valueKey: 'wardsKilled', color: 'text-gray-100' }
                ]
            },
            {
                widget: 'StatCardSimple',
                title: 'Setup Objectifs Neutres', // Harmonisé avec le Support
                valueKey: 'preObjectiveClears',
                opponentValueKey: 'preObjectiveClearsOpponent',
                format: 'number_one_decimal', // Passage en décimal pour la moyenne
                bottomText: "Wards nettoyées 60s avant la mort d'un monstre épique."
            }
        ]
    }
];