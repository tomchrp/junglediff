/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/roles/shared/WidgetRenderer.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Moteur d'instanciation des widgets (Phase 4 Refacto).
 * Reçoit un nœud de configuration brut issu du layout, le valide via le middleware,
 * extrait et formate les données requises, puis retourne le composant React (StatCard,
 * Graphe, Jauge) correspondant. Isole totalement cette logique complexe du contrôleur
 * de vue parent.
 * ============================================================================
 */
import React from 'react';
import StatCard from '../../../ui/StatCard.jsx';
import CircularGauge from '../../../ui/CircularGauge.jsx';
import StatDelta from '../../../ui/StatDelta.jsx';
import UniversalTimelineChart from '../../../ui/charts/UniversalTimelineChart.jsx';
import CustomItemDot from '../../../ui/CustomItemDot.jsx';

import { formatters } from '../../../../core/utils/formatters.js';
import { getNestedValue, prepareTimelineData } from '../../../../core/utils/dataUtils.js';
import { resolveWidgetConfig } from '../../../../core/configs/widgetResolver.js';

/**
 * Composant responsable de l'interprétation d'un bloc de layout en primitive React.
 * * @param {Object} props.rawItem - La configuration brute du widget (JSON).
 * @param {Object} props.data - Le jeu de données complet de l'analyse en cours.
 * @param {string} props.versionDDragon - La version actuelle de l'API Riot (pour les images).
 * @param {boolean} props.isMismatch - Indique si l'analyse oppose deux rôles différents.
 */
export default function WidgetRenderer({ rawItem, data, versionDDragon, isMismatch = false }) {
    if (!data || !rawItem) return null;

    const item = resolveWidgetConfig(rawItem);
    if (!item) return null;

    /**
     * Détermine si la valeur de l'adversaire doit être masquée de l'interface.
     * Appliqué lors d'un conflit d'archétype pour empêcher la comparaison asymétrique,
     * sauf si la métrique est marquée comme universelle (alwaysCompare).
     * * @param {Object} itemConf - L'objet de configuration résolu du widget.
     * @returns {boolean} Vrai si la donnée adverse doit être censurée.
     */
    const shouldHideOpponent = (itemConf) => {
        return isMismatch && !itemConf.alwaysCompare;
    };

    const mult = item.valueMultiplier || 1;
    const val = data[item.valueKey] !== undefined ? data[item.valueKey] * mult : undefined;

    const oppKey = item.opponentValueKey || `${item.valueKey}Opponent`;
    const valOpponent = shouldHideOpponent(item) ? undefined : (data[oppKey] !== undefined ? data[oppKey] * mult : undefined);

    switch (item.widget) {
        case 'StatCardMain':
            const mainVal = data[item.mainValueKey] !== undefined ? data[item.mainValueKey] * mult : undefined;
            const mainValOpp = shouldHideOpponent(item) ? undefined : (data[`${item.mainValueKey}Opponent`] !== undefined ? data[`${item.mainValueKey}Opponent`] * mult : undefined);
            const footVal = data[item.footerValueKey];
            const footValOpp = shouldHideOpponent(item) ? undefined : data[`${item.footerValueKey}Opponent`];

            const formatMain = formatters[item.mainFormat] || formatters.number;
            const formatFoot = formatters[item.footerFormat] || formatters.number;

            return (
                <StatCard
                    title={item.title}
                    footer={item.footerLabel && (
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider">{item.footerLabel}</span>
                            <span className="text-gray-200 font-bold text-sm">{formatFoot(footVal)}</span>
                            {valOpponent !== undefined && (
                                <StatDelta value={footVal} opponentValue={footValOpp} type="number" showBackground={true} />
                            )}
                        </div>
                    )}
                >
                    <div className="flex flex-col h-full items-center justify-center text-center">
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <span className="text-gray-100 font-bold text-4xl" title={item.mainTooltip}>
                                {formatMain(mainVal)}
                            </span>
                            {mainValOpp !== undefined && (
                                <StatDelta value={mainVal} opponentValue={mainValOpp} showBackground={true} />
                            )}
                        </div>
                        {item.bottomText && (
                            <div className="mt-auto pt-2 text-lol-textMuted text-[10px] uppercase font-bold tracking-wider leading-tight">
                                {item.bottomText}
                            </div>
                        )}
                    </div>
                </StatCard>
            );

        case 'CircularGauge':
            return (
                <div className="h-full">
                    <CircularGauge
                        label={item.label}
                        value={(val || 0) * 100}
                        opponentValue={valOpponent !== undefined ? valOpponent * 100 : undefined}
                        color={item.color}
                    />
                </div>
            );

        case 'StatCardSimple':
            const formatter = formatters[item.format] || formatters.number;
            const isTimeType = item.format && item.format.includes('time');
            return (
                <StatCard title={item.title}>
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <span className="text-gray-100 font-bold text-3xl">{formatter(val)}</span>
                            {valOpponent !== undefined && (
                                <StatDelta value={val} opponentValue={valOpponent} type={isTimeType ? 'time' : 'number'} polarity={item.polarity} showBackground={true} />
                            )}
                        </div>
                        {item.bottomText && (
                            <div className="mt-auto pt-2 text-lol-textMuted text-[10px] uppercase font-bold tracking-wider leading-tight">
                                {item.bottomText}
                            </div>
                        )}
                    </div>
                </StatCard>
            );

        case 'StatCardDouble':
            const v1 = data[item.row1ValueKey] !== undefined ? data[item.row1ValueKey] * mult : undefined;
            const v1Opp = shouldHideOpponent(item) ? undefined : (data[`${item.row1ValueKey}Opponent`] !== undefined ? data[`${item.row1ValueKey}Opponent`] * mult : undefined);
            const v2 = data[item.row2ValueKey] !== undefined ? data[item.row2ValueKey] * mult : undefined;
            const v2Opp = shouldHideOpponent(item) ? undefined : (data[`${item.row2ValueKey}Opponent`] !== undefined ? data[`${item.row2ValueKey}Opponent`] * mult : undefined);

            const formatR1 = formatters[item.row1Format] || formatters.number;
            const formatR2 = formatters[item.row2Format] || formatters.number;

            return (
                <StatCard title={item.title}>
                    <div className="flex flex-col gap-4 w-full px-2 justify-center h-full">
                        <div className="flex justify-between items-center w-full">
                            <span className="text-gray-200 text-xs font-medium">{item.row1Label}</span>
                            <div className="flex items-center gap-2">
                                <span className={`${item.row1Color} font-bold`}>{formatR1(v1)}</span>
                                {v1Opp !== undefined && <StatDelta value={v1} opponentValue={v1Opp} showBackground={true} />}
                            </div>
                        </div>
                        <div className="flex justify-between items-center w-full">
                            <span className="text-gray-200 text-xs font-medium">{item.row2Label}</span>
                            <div className="flex items-center gap-2">
                                <span className={`${item.row2Color} font-bold`}>{formatR2(v2)}</span>
                                {v2Opp !== undefined && <StatDelta value={v2} opponentValue={v2Opp} showBackground={true} />}
                            </div>
                        </div>
                    </div>
                </StatCard>
            );

        case 'StatCardList':
            return (
                <StatCard title={item.title}>
                    <div className="flex flex-col gap-3 flex-1 w-full px-2 justify-center h-full">
                        {item.listItems.map((listItem, lIdx) => {
                            const lVal = data[listItem.valueKey];
                            const lValOpp = shouldHideOpponent(item) ? undefined : data[`${listItem.valueKey}Opponent`];
                            return (
                                <div key={lIdx} className="flex justify-between items-center w-full">
                                    <span className="text-gray-200 text-xs">{listItem.label}</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`${listItem.color} font-bold`}>{lVal}</span>
                                        {lValOpp !== undefined && <StatDelta value={lVal} opponentValue={lValOpp} showBackground={true} />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </StatCard>
            );

        case 'AdvancedTimelineChart':
            const mappedLines = item.lines.map(line => ({
                ...line,
                dot: line.dotRenderer === 'CustomItemDot' ? (props) => <CustomItemDot {...props} versionDDragon={versionDDragon} /> : undefined
            }));

            let chartData = getNestedValue(data, item.dataKey);
            if (item.dataKey.includes('damage_graph') && chartData) {
                chartData = prepareTimelineData(chartData);
            }

            return (
                <UniversalTimelineChart
                    title={item.title}
                    data={chartData}
                    xAxisKey={item.xAxisKey}
                    formatXAxis={(v) => `${Math.floor(v / 60000)}m`}
                    lines={mappedLines}
                />
            );

        default:
            return null;
    }
}