/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/support/SupportVisionChart.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Visualisation asynchrone et lissée des événements de vision.
 * Se base sur un flux de données orienté événements (Event-Driven) pour
 * afficher les points d'inflexion exactement aux secondes où ils surviennent.
 * Intègre un composant de légende 100% contrôlé (CustomLegend) pour garantir
 * le toggle.
 * ============================================================================
 */

import React, { useState, useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

/**
 * Convertit une minute décimale (ex: 12.5) en format min:sec (12:30)
 */
const formatExactTime = (decimalMinute) => {
    const m = Math.floor(decimalMinute);
    const s = Math.round((decimalMinute - m) * 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-panel p-3 border border-border-glass text-xs">
                <p className="text-gray-100 font-bold mb-2 pb-1 border-b border-border-strong">
                    Temps : {formatExactTime(label)}
                </p>
                {payload.map((entry, index) => (
                    <div key={`item-${index}`} className="flex justify-between gap-4 py-0.5">
                        <span style={{ color: entry.color }} className="font-medium">
                            {entry.name}
                        </span>
                        <span className="text-gray-100 font-bold tabular-nums">
                            {entry.value}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

/**
 * Légende 100% contrôlée pour pallier aux limitations de clics de Recharts
 */
const CustomLegend = ({ activeLines, onToggle }) => {
    const items = [
        { id: 'playerWardsPlaced', label: 'Wards Posées', color: '#2debb1' },
        { id: 'playerWardsKilled', label: 'Wards Détruites', color: '#C1A657' },
        { id: 'opponentWardsPlaced', label: 'Wards Ennemies', color: '#ff4e50' }
    ];

    return (
        <div className="flex justify-center gap-6 mt-4 text-[11px]">
            {items.map((item) => {
                const isActive = activeLines[item.id];
                return (
                    <div
                        key={item.id}
                        onClick={() => onToggle(item.id)}
                        className="flex items-center gap-2 cursor-pointer select-none transition-opacity hover:opacity-80"
                        style={{ color: isActive ? item.color : '#4a4a4a' }}
                    >
                        <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: isActive ? item.color : '#4a4a4a' }}
                        ></div>
                        <span className="font-bold uppercase tracking-wider">{item.label}</span>
                    </div>
                );
            })}
        </div>
    );
};

const SupportVisionChart = ({ chartData }) => {
    const [activeLines, setActiveLines] = useState({
        playerWardsPlaced: true,
        playerWardsKilled: true,
        opponentWardsPlaced: true
    });

    const ticks = useMemo(() => {
        if (!chartData || chartData.length === 0) return [];
        const maxMinute = chartData[chartData.length - 1].minute;
        const generatedTicks = [];
        for (let i = 0; i <= maxMinute; i += 3) {
            generatedTicks.push(i);
        }
        return generatedTicks;
    }, [chartData]);

    if (!chartData || chartData.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center border border-border-glass bg-surface-solid/50 rounded text-lol-textMuted text-xs">
                Données temporelles indisponibles
            </div>
        );
    }

    const toggleLine = (id) => {
        setActiveLines(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="h-64 w-full glass-panel p-2 mt-4 flex flex-col">
            <h4 className="text-lol-textMuted font-bold uppercase tracking-wider text-xs mb-2 ml-2">
                Évolution temporelle exacte de la vision
            </h4>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                        <XAxis
                            dataKey="minute"
                            type="number"
                            domain={['dataMin', 'dataMax']}
                            ticks={ticks}
                            stroke="#888888"
                            tick={{ fill: '#888888', fontSize: 10 }}
                            tickFormatter={(val) => Math.floor(val)}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888888"
                            tick={{ fill: '#888888', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend content={<CustomLegend activeLines={activeLines} onToggle={toggleLine} />} />

                        <Line
                            hide={!activeLines.playerWardsPlaced}
                            type="monotone"
                            dataKey="playerWardsPlaced"
                            name="Wards Posées"
                            stroke="#2debb1"
                            strokeWidth={2}
                            dot={{ r: 2.5, fill: '#2debb1', strokeWidth: 0 }}
                            activeDot={{ r: 5, fill: '#2debb1', stroke: '#050505', strokeWidth: 2 }}
                            isAnimationActive={false}
                        />
                        <Line
                            hide={!activeLines.playerWardsKilled}
                            type="monotone"
                            dataKey="playerWardsKilled"
                            name="Wards Détruites"
                            stroke="#C1A657"
                            strokeWidth={2}
                            dot={{ r: 2.5, fill: '#C1A657', strokeWidth: 0 }}
                            activeDot={{ r: 5, fill: '#C1A657', stroke: '#050505', strokeWidth: 2 }}
                            isAnimationActive={false}
                        />
                        <Line
                            hide={!activeLines.opponentWardsPlaced}
                            type="monotone"
                            dataKey="opponentWardsPlaced"
                            name="Wards Ennemies"
                            stroke="#ff4e50"
                            strokeWidth={2}
                            dot={{ r: 2.5, fill: '#ff4e50', strokeWidth: 0 }}
                            activeDot={{ r: 5, fill: '#ff4e50', stroke: '#050505', strokeWidth: 2 }}
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default SupportVisionChart;