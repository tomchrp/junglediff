/**
 * ============================================================================
 * FICHIER : frontend/src/core/configs/layouts/shared/visionLayouts.js
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Contient les configurations visuelles partagées entre plusieurs archétypes
 * pour éviter la duplication de code. 
 * Actuellement, centralise la grille de vision pour les rôles Support.
 * ============================================================================
 */

export const supportVisionLayout = [
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