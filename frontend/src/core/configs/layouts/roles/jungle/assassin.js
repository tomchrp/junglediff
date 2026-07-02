/**
 * ============================================================================
 * FICHIER : frontend/src/core/configs/layouts/roles/jungle/assassin.js
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Configuration UI spécifique pour l'archétype ASSASSIN en Jungle.
 * Cartographie tous les onglets : combat, objectifs, ressources, vision.
 * ============================================================================
 */

import { jungleVisionLayout } from '../../shared/denialVisionLayouts';

export const assassinLayout = {
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
    vision: jungleVisionLayout
};