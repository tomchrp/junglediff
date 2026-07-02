/**
 * ============================================================================
 * FICHIER : frontend/src/components/ui/AdvancedTimelineChart.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Primitive graphique universelle pour le rendu de séries temporelles.
 * * CORRECTIONS APPORTÉES :
 * - Création de sous-composants intelligents pour les points d'inflexion 
 * (ConditionalEventDot et ConditionalActiveDot).
 * - Ces composants suppriment l'artefact visuel des faux positifs sur les 
 * graphiques cumulés en ne dessinant un marqueur que si la valeur a 
 * réellement évolué par rapport au point temporel précédent.
 * ============================================================================
 */

import React, { useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

/**
 * Composant de survol (Tooltip) agnostique.
 * Il itère sur le payload généré par Recharts pour afficher dynamiquement 
 * le nom et la valeur de chaque courbe visible, peu importe la donnée métier.
 */
const DefaultTooltip = ({ active, payload, label, formatXAxis }) => {
    if (active && payload && payload.length) {
        const hasItems = payload.some(p => p.payload.itemIds && p.payload.itemIds.length > 0);

        return (
            <div className="glass-panel p-3 border border-border-glass text-xs min-w-[150px] shadow-lg z-50">
                <p className="text-gray-100 font-bold mb-2 pb-1 border-b border-border-strong">
                    Temps : {formatXAxis ? formatXAxis(label) : label}
                </p>

                {payload.map((entry, index) => {
                    if (entry.dataKey === 'trendDamage' || entry.value === null) return null;

                    return (
                        <div key={`item-${index}`} className="flex justify-between gap-4 py-1">
                            <span className="font-medium" style={{ color: entry.color }}>
                                {entry.name}
                            </span>
                            <span className="text-gray-100 font-bold tabular-nums">
                                {entry.value.toLocaleString()}
                            </span>
                        </div>
                    );
                })}

                {hasItems && (
                    <div className="mt-2 pt-2 border-t border-border-strong text-lol-gold text-[10px] uppercase font-bold tracking-wider">
                        Power Spike (Achat majeur)
                    </div>
                )}
            </div>
        );
    }
    return null;
};

/**
 * Évalue si la donnée a changé par rapport à l'index précédent.
 * Permet de ne dessiner un point que lorsqu'un événement réel a eu lieu sur cette courbe précise.
 * * @param {Object} props - Propriétés injectées automatiquement par Recharts (cx, cy, payload, index).
 * @returns {JSX.Element|null} Le point SVG ou null si la valeur est stagnante.
 */
const ConditionalEventDot = (props) => {
    const { cx, cy, payload, index, dataKey, color, data } = props;

    if (index === 0) return null;

    const prevValue = data[index - 1][dataKey];
    const currentValue = payload[dataKey];

    if (currentValue === prevValue) return null;

    return (
        <circle
            cx={cx}
            cy={cy}
            r={3}
            fill={color}
            stroke="#050505"
            strokeWidth={1}
        />
    );
};

/**
 * Gère l'affichage du point d'inflexion élargi lors du survol de la souris.
 * Applique la même logique de conditionnalité stricte que ConditionalEventDot.
 * * @param {Object} props - Propriétés injectées automatiquement par Recharts.
 * @returns {JSX.Element|null} Le point SVG agrandi ou null.
 */
const ConditionalActiveDot = (props) => {
    const { cx, cy, payload, index, dataKey, color, data } = props;

    if (index === 0) return null;

    const prevValue = data[index - 1][dataKey];
    const currentValue = payload[dataKey];

    if (currentValue === prevValue) return null;

    return (
        <circle
            cx={cx}
            cy={cy}
            r={5}
            fill={color}
            stroke="#050505"
            strokeWidth={2}
        />
    );
};

const AdvancedTimelineChart = ({
    title,
    data,
    xAxisKey = 'time',
    lines = [],
    height = 'h-[320px]',
    formatXAxis
}) => {
    const [hiddenLines, setHiddenLines] = useState({});

    /**
     * Inverse l'état de visibilité de la courbe ciblée dans le graphe.
     */
    const handleLegendClick = (e) => {
        const { dataKey } = e;
        setHiddenLines(prev => ({
            ...prev,
            [dataKey]: !prev[dataKey]
        }));
    };

    if (!data || data.length === 0) return null;

    const defaultFormatXAxis = (tickItem) => {
        if (typeof tickItem === 'number') {
            return `${Math.floor(tickItem / 60000)}m`;
        }
        return tickItem;
    };

    const activeXFormatter = formatXAxis || defaultFormatXAxis;

    return (
        <div className="flex flex-col gap-2 w-full animate-in fade-in zoom-in-95 duration-200">
            {title && (
                <div className="flex items-center justify-center mb-2">
                    <h4 className="text-lol-textMuted font-bold uppercase tracking-wider text-[10px]">
                        {title}
                    </h4>
                </div>
            )}

            <div className={`w-full ${height} bg-surface-solid border border-border-glass rounded-lg p-3 flex flex-col`}>
                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />

                            <XAxis
                                dataKey={xAxisKey}
                                type="number"
                                domain={['dataMin', 'dataMax']}
                                stroke="#888888"
                                fontSize={10}
                                tickFormatter={activeXFormatter}
                                axisLine={false}
                                tickLine={false}
                            />

                            <YAxis
                                stroke="#888888"
                                fontSize={10}
                                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                                axisLine={false}
                                tickLine={false}
                            />

                            <Tooltip
                                content={<DefaultTooltip formatXAxis={activeXFormatter} />}
                                cursor={{ stroke: '#444', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />

                            <Legend
                                iconType="circle"
                                wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '10px', cursor: 'pointer' }}
                                onClick={handleLegendClick}
                                formatter={(value, entry) => (
                                    <span style={{
                                        color: hiddenLines[entry.dataKey] ? '#4a4a4a' : entry.color,
                                        transition: 'color 0.2s'
                                    }}>
                                        {value}
                                    </span>
                                )}
                            />

                            {lines.map((lineConfig, index) => {
                                let currentDot = false;
                                let currentActiveDot = { r: 6, strokeWidth: 0 };

                                if (lineConfig.dotRenderer) {
                                    currentDot = lineConfig.dot;
                                    currentActiveDot = false;
                                } else if (lineConfig.showDots) {
                                    currentDot = (dotProps) => <ConditionalEventDot {...dotProps} data={data} dataKey={lineConfig.dataKey} color={lineConfig.color} />;
                                    currentActiveDot = (dotProps) => <ConditionalActiveDot {...dotProps} data={data} dataKey={lineConfig.dataKey} color={lineConfig.color} />;
                                }

                                return (
                                    <Line
                                        key={index}
                                        hide={hiddenLines[lineConfig.dataKey]}
                                        type={lineConfig.type || "monotone"}
                                        dataKey={lineConfig.dataKey}
                                        name={lineConfig.name}
                                        stroke={lineConfig.color}
                                        strokeWidth={lineConfig.strokeWidth || 2}
                                        strokeDasharray={lineConfig.isDashed ? "5 5" : "0"}
                                        connectNulls={lineConfig.connectNulls || false}
                                        dot={currentDot}
                                        activeDot={currentActiveDot}
                                        isAnimationActive={false}
                                    />
                                );
                            })}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default AdvancedTimelineChart;