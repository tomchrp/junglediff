/**
 * ============================================================================
 * FICHIER : frontend/src/components/ui/charts/UniversalTimelineChart.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Primitive graphique universelle.
 * * CORRECTIONS APPORTÉES :
 * - Les EventDots conditionnels renvoient désormais un <circle opacity={0} /> 
 * au lieu de null pour empêcher le crash interne du SVG Recharts.
 * - L'axe Y est protégé contre l'effondrement [0, 0] via une fonction dataMax.
 * ============================================================================
 */

import React, { useState } from 'react';
import {
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

const DefaultTooltip = ({ active, payload, label, formatXAxis }) => {
    if (active && payload && payload.length) {
        const hasItems = payload.some(p => p.payload && p.payload.itemIds && p.payload.itemIds.length > 0);

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

const ConditionalEventDot = (props) => {
    const { cx, cy, payload, index, dataKey, color, data } = props;

    // FIX : Renvoie un cercle invisible pour satisfaire le moteur de rendu React de Recharts
    if (index === 0 || !data || !data[index - 1]) return <circle cx={cx} cy={cy} r={0} opacity={0} />;

    const prevValue = data[index - 1][dataKey];
    const currentValue = payload[dataKey];

    if (currentValue === prevValue) return <circle cx={cx} cy={cy} r={0} opacity={0} />;

    return <circle cx={cx} cy={cy} r={3} fill={color} stroke="#050505" strokeWidth={1} />;
};

const ConditionalActiveDot = (props) => {
    const { cx, cy, payload, index, dataKey, color, data } = props;
    if (index === 0 || !data || !data[index - 1]) return <circle cx={cx} cy={cy} r={0} opacity={0} />;

    const prevValue = data[index - 1][dataKey];
    const currentValue = payload[dataKey];

    if (currentValue === prevValue) return <circle cx={cx} cy={cy} r={0} opacity={0} />;

    return <circle cx={cx} cy={cy} r={5} fill={color} stroke="#050505" strokeWidth={2} />;
};

export default function UniversalTimelineChart({
    title,
    data,
    xAxisKey = 'time',
    lines = [],
    areas = [],
    height = 'h-[320px]',
    formatXAxis,
    customTooltip,
    yAxisConfig,
    margin = { top: 20, right: 20, left: -10, bottom: 5 }
}) {
    const [hiddenSeries, setHiddenSeries] = useState({});

    const handleLegendClick = (e) => {
        const { dataKey } = e;
        setHiddenSeries(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
    };

    if (!data || data.length === 0) {
        return (
            <div className={`w-full ${height} flex items-center justify-center bg-surface-solid rounded-lg border border-border-glass text-lol-textMuted text-xs italic`}>
                Données temporelles insuffisantes
            </div>
        );
    }

    const defaultFormatXAxis = (tickItem) => {
        if (typeof tickItem === 'number' && tickItem > 1000) {
            return `${Math.floor(tickItem / 60000)}m`;
        }
        return tickItem;
    };

    const activeXFormatter = formatXAxis || defaultFormatXAxis;
    const TooltipComponent = customTooltip || <DefaultTooltip formatXAxis={activeXFormatter} />;

    return (
        <div className={`flex flex-col gap-2 w-full animate-in fade-in zoom-in-95 duration-200 ${height === 'h-full' ? 'h-full' : ''}`}>
            {title && (
                <div className="flex items-center justify-center mb-1 shrink-0">
                    <h4 className="text-lol-textMuted font-bold uppercase tracking-wider text-[10px]">
                        {title}
                    </h4>
                </div>
            )}

            <div className={`w-full ${height === 'h-full' ? 'flex-1' : height} bg-surface-solid border border-border-glass rounded-lg p-3 flex flex-col min-h-0`}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={margin}>
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
                            dy={8}
                        />

                        {/* FIX : dataMax === 0 ? 1 empêche l'axe Y de s'effondrer sur [0, 0] */}
                        <YAxis
                            domain={yAxisConfig?.domain || [0, dataMax => (dataMax === 0 ? 1 : dataMax)]}
                            ticks={yAxisConfig?.ticks}
                            stroke="#888888"
                            fontSize={10}
                            tickFormatter={yAxisConfig?.tickFormatter || ((value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value)}
                            axisLine={false}
                            tickLine={false}
                        />

                        <Tooltip
                            content={TooltipComponent}
                            cursor={{ stroke: '#ffffff', strokeOpacity: 0.1, strokeWidth: 2, strokeDasharray: '4 4' }}
                        />

                        <Legend
                            iconType="circle"
                            wrapperStyle={{ fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                            onClick={handleLegendClick}
                            formatter={(value, entry) => (
                                <span style={{ color: hiddenSeries[entry.dataKey] ? '#4a4a4a' : entry.color, transition: 'color 0.2s' }}>
                                    {value}
                                </span>
                            )}
                        />

                        {areas.map((area, index) => (
                            <Area
                                key={`area-${index}`}
                                hide={hiddenSeries[area.dataKey]}
                                name={area.name}
                                type={area.type || "monotone"}
                                dataKey={area.dataKey}
                                fill={area.fill}
                                fillOpacity={area.fillOpacity}
                                stroke={area.stroke}
                                strokeOpacity={area.strokeOpacity}
                                isAnimationActive={false}
                            />
                        ))}

                        {lines.map((line, index) => {
                            let currentDot = line.dot !== undefined ? line.dot : false;
                            let currentActiveDot = line.activeDot !== undefined ? line.activeDot : { r: 6, strokeWidth: 0 };

                            if (line.dot === undefined && line.showDots) {
                                currentDot = (dotProps) => <ConditionalEventDot {...dotProps} data={data} dataKey={line.dataKey} color={line.color} />;
                                currentActiveDot = (dotProps) => <ConditionalActiveDot {...dotProps} data={data} dataKey={line.dataKey} color={line.color} />;
                            }

                            return (
                                <Line
                                    key={`line-${index}`}
                                    hide={hiddenSeries[line.dataKey]}
                                    type={line.type || "monotone"}
                                    dataKey={line.dataKey}
                                    name={line.name}
                                    stroke={line.color}
                                    strokeWidth={line.strokeWidth || 2}
                                    strokeDasharray={line.isDashed ? "5 5" : "0"}
                                    connectNulls={line.connectNulls || false}
                                    dot={currentDot}
                                    activeDot={currentActiveDot}
                                    isAnimationActive={false}
                                />
                            );
                        })}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}