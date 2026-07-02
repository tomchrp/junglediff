/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/roles/shared/DynamicExpertView.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Usine à vues (View Factory) pilotée par la configuration.
 * Instancie dynamiquement les composants React en fonction du dictionnaire.
 * 
 * MODIFICATIONS :
 * - Ajout de la gestion du multiplicateur `valueMultiplier` pour formater 
 *   aisément les ratios bruts (0.15) en valeurs exploitables (15).
 * - Intégration de commentaires descriptifs pour la maintenance de l'usine.
 * ============================================================================
 */

import React, { useMemo } from 'react';
import StatCard from '../../../ui/StatCard.jsx';
import CircularGauge from '../../../ui/CircularGauge.jsx';
import StatDelta from '../../../ui/StatDelta.jsx';
import AdvancedTimelineChart from '../../../ui/AdvancedTimelineChart.jsx';
import CustomItemDot from '../../../ui/CustomItemDot.jsx';

const formatters = {
    number: (val) => (val || 0).toLocaleString(),
    number_zero_decimal: (val) => (val || 0).toFixed(0),
    number_one_decimal: (val) => (val || 0).toFixed(1),
    percentage: (val) => `${(val || 0).toFixed(0)}%`,
    time_seconds: (val) => {
        if (val === undefined || val === null) return "N/A";
        const total = Math.floor(val);
        const m = Math.floor(total / 60);
        const s = total % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    },
    time_milliseconds: (val) => {
        if (val === undefined || val === null) return "N/A";
        const total = Math.floor(val / 1000);
        const m = Math.floor(total / 60);
        const s = total % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
};

/**
 * Parcourt un objet de manière récursive pour extraire une valeur à partir d'un chemin.
 * Permet d'utiliser des chaînes comme 'timelineGraph.events' dans le dictionnaire.
 */
const getNestedValue = (obj, path) => {
    if (!path || !obj) return undefined;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

/**
 * Assainit les données temporelles pour le graphique de combat.
 * Identifie les achats d'objets et génère les points de la ligne de tendance.
 */
const prepareTimelineData = (graphData) => {
    if (!graphData || !Array.isArray(graphData)) return [];
    return graphData.map((point, index) => {
        const isFirst = index === 0;
        const isLast = index === graphData.length - 1;
        const hasItem = point.itemIds && point.itemIds.length > 0;
        return {
            ...point,
            trendDamage: (isFirst || isLast || hasItem) ? point.totalDamage : null
        };
    });
};

const DynamicExpertView = ({ layout, data, versionDDragon }) => {

    const chartDataProcessed = useMemo(() => {
        const combatData = getNestedValue(data, 'timelineGraph.damage_graph');
        if (combatData) return prepareTimelineData(combatData);
        return null;
    }, [data]);

    const getDotRenderer = (rendererName) => {
        if (rendererName === 'CustomItemDot') {
            return (props) => <CustomItemDot {...props} versionDDragon={versionDDragon} />;
        }
        return false;
    };

    if (!data || !layout) return null;

    /**
     * Cœur du moteur de rendu.
     * Lit un élément du layout, extrait les données correspondantes dans le payload,
     * gère les multiplicateurs mathématiques, et retourne le composant React adéquat.
     */
    const renderWidget = (item, index) => {
        const mult = item.valueMultiplier || 1;
        const val = data[item.valueKey] !== undefined ? data[item.valueKey] * mult : undefined;
        const oppKey = item.opponentValueKey || `${item.valueKey}Opponent`;
        const valOpponent = data[oppKey] !== undefined ? data[oppKey] * mult : undefined;

        switch (item.widget) {
            case 'StatCardMain':
                const mainVal = data[item.mainValueKey] !== undefined ? data[item.mainValueKey] * mult : undefined;
                const mainValOpp = data[`${item.mainValueKey}Opponent`] !== undefined ? data[`${item.mainValueKey}Opponent`] * mult : undefined;
                const footVal = data[item.footerValueKey];
                const footValOpp = data[`${item.footerValueKey}Opponent`];

                const formatMain = formatters[item.mainFormat] || formatters.number;
                const formatFoot = formatters[item.footerFormat] || formatters.number;

                return (
                    <StatCard
                        key={index}
                        title={item.title}
                        footer={item.footerLabel && (
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider">{item.footerLabel}</span>
                                <span className="text-gray-200 font-bold text-sm">{formatFoot(footVal)}</span>
                                <StatDelta value={footVal} opponentValue={footValOpp} type="number" showBackground={true} />
                            </div>
                        )}
                    >
                        <div className="flex flex-col h-full items-center justify-center text-center">
                            <div className="flex items-center justify-center gap-3 mb-2">
                                <span className="text-gray-100 font-bold text-4xl" title={item.mainTooltip}>
                                    {formatMain(mainVal)}
                                </span>
                                <StatDelta value={mainVal} opponentValue={mainValOpp} showBackground={true} />
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
                    <div key={index} className="h-full">
                        <CircularGauge
                            label={item.label}
                            value={(val || 0) * 100}
                            opponentValue={(valOpponent || 0) * 100}
                            color={item.color}
                        />
                    </div>
                );

            case 'StatCardSimple':
                const formatter = formatters[item.format] || formatters.number;
                const isTimeType = item.format && item.format.includes('time');
                return (
                    <StatCard key={index} title={item.title}>
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
                const v1Opp = data[`${item.row1ValueKey}Opponent`] !== undefined ? data[`${item.row1ValueKey}Opponent`] * mult : undefined;
                const v2 = data[item.row2ValueKey] !== undefined ? data[item.row2ValueKey] * mult : undefined;
                const v2Opp = data[`${item.row2ValueKey}Opponent`] !== undefined ? data[`${item.row2ValueKey}Opponent`] * mult : undefined;
                return (
                    <StatCard key={index} title={item.title}>
                        <div className="flex flex-col gap-4 w-full px-2 justify-center h-full">
                            <div className="flex justify-between items-center w-full">
                                <span className="text-gray-200 text-xs font-medium">{item.row1Label}</span>
                                <div className="flex items-center gap-2">
                                    <span className={`${item.row1Color} font-bold`}>{v1}</span>
                                    <StatDelta value={v1} opponentValue={v1Opp} showBackground={true} />
                                </div>
                            </div>
                            <div className="flex justify-between items-center w-full">
                                <span className="text-gray-200 text-xs font-medium">{item.row2Label}</span>
                                <div className="flex items-center gap-2">
                                    <span className={`${item.row2Color} font-bold`}>{v2}</span>
                                    <StatDelta value={v2} opponentValue={v2Opp} showBackground={true} />
                                </div>
                            </div>
                        </div>
                    </StatCard>
                );

            case 'StatCardList':
                return (
                    <StatCard key={index} title={item.title}>
                        <div className="flex flex-col gap-3 flex-1 w-full px-2 justify-center h-full">
                            {item.listItems.map((listItem, lIdx) => {
                                const lVal = data[listItem.valueKey];
                                const lValOpp = data[`${listItem.valueKey}Opponent`];
                                return (
                                    <div key={lIdx} className="flex justify-between items-center w-full">
                                        <span className="text-gray-200 text-xs">{listItem.label}</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`${listItem.color} font-bold`}>{lVal}</span>
                                            <StatDelta value={lVal} opponentValue={lValOpp} showBackground={true} />
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
                    dot: getDotRenderer(line.dotRenderer)
                }));
                const chartData = chartDataProcessed || getNestedValue(data, item.dataKey);

                return (
                    <AdvancedTimelineChart
                        key={index}
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
    };

    return (
        <div className="flex flex-col gap-4 mt-2 w-full animate-in fade-in zoom-in-95 duration-200">
            {layout.map((row, rowIndex) => {
                if (row.type === 'grid') {
                    return (
                        <div key={`row-${rowIndex}`} className={`grid grid-cols-1 lg:grid-cols-${row.cols} gap-4`}>
                            {row.items.map((item, idx) => renderWidget(item, idx))}
                        </div>
                    );
                }
                if (row.type === 'row') {
                    return (
                        <React.Fragment key={`row-${rowIndex}`}>
                            {row.items.map((item, idx) => renderWidget(item, idx))}
                        </React.Fragment>
                    );
                }
                return null;
            })}
        </div>
    );
};

export default DynamicExpertView;