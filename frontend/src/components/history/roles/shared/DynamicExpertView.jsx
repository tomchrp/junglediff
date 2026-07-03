/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/roles/shared/DynamicExpertView.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Usine à vues (View Factory) pilotée par la configuration (Configuration-Driven UI).
 * Intercepte un schéma JSON (layout) et instancie dynamiquement les primitives React.
 * * * MODIFICATIONS (Phase 6 - Verrouillage) :
 * - Suppression du mode de rétrocompatibilité (fallback).
 * - Implémentation du Strict Mode : si un bloc de configuration de layout 
 * ne fait pas référence à une constante du metricsRegistry, son rendu est 
 * bloqué et une erreur est levée en console. Cela garantit la pérennité 
 * de la "Single Source of Truth".
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
 * Permet d'utiliser des chemins imbriqués (ex: 'timelineGraph.events') directement 
 * depuis le dictionnaire statique de configuration.
 * * @param {Object} obj - L'objet de données source (ex: tabs_data.combat)
 * @param {string} path - Le chemin sous forme de chaîne de caractères (ex: "a.b.c")
 * @returns {*} La valeur extraite ou undefined si le chemin est invalide.
 */
const getNestedValue = (obj, path) => {
    if (!path || !obj) return undefined;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

/**
 * Assainit les données temporelles pour le graphique de combat.
 * Filtre les données brutes pour isoler les achats d'objets majeurs et génère 
 * les valeurs nécessaires au tracé d'une droite de tendance continue entre le début,
 * les achats d'objets, et la fin de la partie.
 * * @param {Array} graphData - Les données brutes de la timeline extraites du backend.
 * @returns {Array} Le tableau enrichi avec la clé 'trendDamage'.
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

/**
 * MIDDLEWARE DE STANDARDISATION STRICTE (Phase 6)
 * Fusionne la configuration du layout avec le registre des métriques.
 * Applique une validation stricte : rejette toute configuration qui tente 
 * de définir ses propres clés métiers ou labels en dur sans passer par le registre.
 * * @param {Object} rawItem - Le nœud de configuration du widget brut issu du layout.
 * @returns {Object|null} La configuration résolue, ou null si elle viole l'architecture.
 */
const resolveWidgetConfig = (rawItem) => {
    // Validation d'architecture : le widget DOIT utiliser le registre
    const usesRegistry = rawItem.metric
        || rawItem.row1Metric
        || (rawItem.listItems && rawItem.listItems.some(li => li.metric))
        || (rawItem.lines && rawItem.lines.some(l => l.metric));

    if (!usesRegistry) {
        console.error(`[JungleDiff Strict Mode] Violation d'architecture détectée. Le widget suivant tente de s'afficher sans utiliser le metricsRegistry, ce qui est strictement interdit :`, rawItem);
        return null;
    }

    const resolved = { ...rawItem };

    if (rawItem.metric) {
        resolved.widget = rawItem.widget || rawItem.metric.defaultWidget;
        resolved.title = rawItem.override?.label || rawItem.metric.defaultLabel || rawItem.title;
        resolved.label = rawItem.override?.label || rawItem.metric.defaultLabel || rawItem.label;
        resolved.valueKey = rawItem.metric.valueKey || rawItem.valueKey;
        resolved.opponentValueKey = rawItem.metric.opponentValueKey || rawItem.opponentValueKey;
        resolved.format = rawItem.metric.format || rawItem.format;
        resolved.color = rawItem.override?.color || rawItem.metric.color || rawItem.color;
        resolved.bottomText = rawItem.override?.description || rawItem.metric.description || rawItem.bottomText;
        resolved.polarity = rawItem.metric.polarity || rawItem.polarity;

        if (resolved.widget === 'StatCardMain') {
            resolved.mainValueKey = rawItem.metric.valueKey || rawItem.mainValueKey;
            resolved.mainFormat = rawItem.metric.format || rawItem.mainFormat;

            const fMetric = rawItem.footerMetric || rawItem.metric.defaultFooter;
            if (fMetric) {
                resolved.footerLabel = rawItem.override?.footerLabel || fMetric.label || fMetric.defaultLabel || rawItem.footerLabel;
                resolved.footerValueKey = fMetric.valueKey || rawItem.footerValueKey;
                resolved.footerFormat = fMetric.format || rawItem.footerFormat;
            }
        }
    }

    if (rawItem.row1Metric) {
        resolved.row1Label = rawItem.row1Override?.label || rawItem.row1Metric.defaultLabel || rawItem.row1Label;
        resolved.row1ValueKey = rawItem.row1Metric.valueKey || rawItem.row1ValueKey;
        resolved.row1Color = rawItem.row1Override?.color || rawItem.row1Metric.color || rawItem.row1Color;
        resolved.row1Format = rawItem.row1Override?.format || rawItem.row1Metric.format || rawItem.row1Format; // <-- LIGNE À AJOUTER
    }
    if (rawItem.row2Metric) {
        resolved.row2Label = rawItem.row2Override?.label || rawItem.row2Metric.defaultLabel || rawItem.row2Label;
        resolved.row2ValueKey = rawItem.row2Metric.valueKey || rawItem.row2ValueKey;
        resolved.row2Color = rawItem.row2Override?.color || rawItem.row2Metric.color || rawItem.row2Color;
        resolved.row2Format = rawItem.row2Override?.format || rawItem.row2Metric.format || rawItem.row2Format; // <-- LIGNE À AJOUTER
    }

    if (rawItem.listItems) {
        resolved.listItems = rawItem.listItems.map(li => {
            if (li.metric) {
                return {
                    ...li,
                    label: li.override?.label || li.metric.defaultLabel || li.label,
                    valueKey: li.metric.valueKey || li.valueKey,
                    color: li.override?.color || li.metric.color || li.color
                };
            }
            return li;
        });
    }

    if (rawItem.lines) {
        resolved.lines = rawItem.lines.map(line => {
            if (line.metric) {
                return {
                    ...line,
                    name: line.override?.name || line.metric.defaultName || line.name,
                    dataKey: line.metric.dataKey || line.dataKey,
                    color: line.override?.color || line.metric.color || line.color,
                    strokeWidth: line.metric.strokeWidth !== undefined ? line.metric.strokeWidth : line.strokeWidth,
                    showDots: line.metric.showDots !== undefined ? line.metric.showDots : line.showDots,
                    isDashed: line.metric.isDashed !== undefined ? line.metric.isDashed : line.isDashed
                };
            }
            return line;
        });
    }

    return resolved;
};

const DynamicExpertView = ({ layout, data, versionDDragon, isMismatch = false }) => {

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
     * Détermine si la valeur de l'adversaire doit être masquée de l'interface.
     * Appliqué lors d'un conflit d'archétype (ex: Assassin vs Enchanteur) pour 
     * empêcher la comparaison asymétrique de statistiques incomparables, sauf si 
     * la métrique est explicitly marquée comme universelle (alwaysCompare: true).
     * * @param {Object} item - L'objet de configuration du composant courant.
     * @returns {boolean} Vrai si la donnée adverse doit être censurée.
     */
    const shouldHideOpponent = (item) => {
        return isMismatch && !item.alwaysCompare;
    };

    /**
     * Cœur du moteur de rendu (View Factory).
     * Intercepte un bloc de configuration résolu, extrait les données du backend, 
     * applique les multiplicateurs mathématiques et la logique de censure adverse, 
     * puis instancie le composant UI correspondant avec les bonnes props.
     * * @param {Object} rawItem - Le nœud de configuration brut.
     * @param {number} index - L'index pour la clé React.
     * @returns {JSX.Element|null} Le composant React prêt à l'affichage.
     */
    const renderWidget = (rawItem, index) => {
        const item = resolveWidgetConfig(rawItem);

        // Arrêt immédiat si le middleware a rejeté la configuration
        if (!item) return null;

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
                        key={index}
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
                    <div key={index} className="h-full">
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
                const v1Opp = shouldHideOpponent(item) ? undefined : (data[`${item.row1ValueKey}Opponent`] !== undefined ? data[`${item.row1ValueKey}Opponent`] * mult : undefined);
                const v2 = data[item.row2ValueKey] !== undefined ? data[item.row2ValueKey] * mult : undefined;
                const v2Opp = shouldHideOpponent(item) ? undefined : (data[`${item.row2ValueKey}Opponent`] !== undefined ? data[`${item.row2ValueKey}Opponent`] * mult : undefined);

                // <-- LIGNES À AJOUTER : Récupération des formateurs
                const formatR1 = formatters[item.row1Format] || formatters.number;
                const formatR2 = formatters[item.row2Format] || formatters.number;

                return (
                    <StatCard key={index} title={item.title}>
                        <div className="flex flex-col gap-4 w-full px-2 justify-center h-full">
                            <div className="flex justify-between items-center w-full">
                                <span className="text-gray-200 text-xs font-medium">{item.row1Label}</span>
                                <div className="flex items-center gap-2">
                                    {/* <-- MODIFICATION ICI : On englobe v1 avec formatR1 */}
                                    <span className={`${item.row1Color} font-bold`}>{formatR1(v1)}</span>
                                    {v1Opp !== undefined && <StatDelta value={v1} opponentValue={v1Opp} showBackground={true} />}
                                </div>
                            </div>
                            <div className="flex justify-between items-center w-full">
                                <span className="text-gray-200 text-xs font-medium">{item.row2Label}</span>
                                <div className="flex items-center gap-2">
                                    {/* <-- MODIFICATION ICI : On englobe v2 avec formatR2 */}
                                    <span className={`${item.row2Color} font-bold`}>{formatR2(v2)}</span>
                                    {v2Opp !== undefined && <StatDelta value={v2} opponentValue={v2Opp} showBackground={true} />}
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

    /**
     * Dictionnaire statique indispensable pour Tailwind CSS.
     * Empêche l'élimination des classes dynamiques lors du build de l'application.
     */
    const gridColsMap = {
        1: 'lg:grid-cols-1',
        2: 'lg:grid-cols-2',
        3: 'lg:grid-cols-3',
        4: 'lg:grid-cols-4'
    };

    return (
        <div className="flex flex-col gap-4 mt-2 w-full animate-in fade-in zoom-in-95 duration-200">
            {layout.map((row, rowIndex) => {
                if (row.type === 'grid') {
                    const lgColsClass = gridColsMap[row.cols] || 'lg:grid-cols-1';

                    return (
                        <div key={`row-${rowIndex}`} className={`grid grid-cols-1 ${lgColsClass} gap-4`}>
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