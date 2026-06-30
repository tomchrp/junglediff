/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/roles/support/SupportVisionChart.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Graphe temporel restauré et adapté aux timestamps (ms).
 * - Utilise une interpolation monotone lissée (selon la contrainte).
 * - Affiche un point (dot) explicite pour chaque action de ward.
 * - Calcule l'ordonnée maximale pour verrouiller l'axe Y lors des clics sur la légende.
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
    ResponsiveContainer
} from 'recharts';

const formatExactTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-surface-solid p-3 border border-border-glass text-xs rounded-md shadow-lg z-50">
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

const CustomLegend = ({ activeLines, onToggle }) => {
    const items = [
        { id: 'playerPlaced', label: 'Posées (Moi)', color: '#0ea5e9' },
        { id: 'oppPlaced', label: 'Posées (Adv)', color: '#ef4444' },
        { id: 'playerKilled', label: 'Détruites (Moi)', color: '#38bdf8' },
        { id: 'oppKilled', label: 'Détruites (Adv)', color: '#f87171' }
    ];

    return (
        <div className="flex justify-center flex-wrap gap-4 mt-2 mb-4 text-[10px]">
            {items.map((item) => {
                const isActive = activeLines[item.id];
                return (
                    <div
                        key={item.id}
                        onClick={() => onToggle(item.id)}
                        className="flex items-center gap-1.5 cursor-pointer select-none transition-opacity hover:opacity-80"
                        style={{ color: isActive ? item.color : '#4a4a4a' }}
                    >
                        <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: isActive ? item.color : 'transparent', border: `1px solid ${item.color}` }}
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
        playerPlaced: true,
        oppPlaced: true,
        playerKilled: true,
        oppKilled: true
    });

    /**
     * Calcul de l'ordonnée (Axe Y) maximale dynamique.
     * Permet au graphe de ne pas se redimensionner lorsqu'on cache des courbes.
     */
    const maxGraphValue = useMemo(() => {
        if (!chartData || chartData.length === 0) return 'auto';
        const maxValue = Math.max(
            ...chartData.map(e =>
                Math.max(e.playerPlaced || 0, e.oppPlaced || 0, e.playerKilled || 0, e.oppKilled || 0)
            )
        );
        return maxValue > 0 ? maxValue : 'auto';
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
        <div className="h-80 w-full bg-surface-solid border border-border-glass rounded-md p-3 flex flex-col">
            <h4 className="text-lol-textMuted font-bold uppercase tracking-wider text-[10px] mb-1 text-center">
                Évolution de la vision
            </h4>

            <CustomLegend activeLines={activeLines} onToggle={toggleLine} />

            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                        <XAxis
                            dataKey="timestamp"
                            type="number"
                            domain={['dataMin', 'dataMax']}
                            stroke="#888888"
                            tick={{ fill: '#888888', fontSize: 10 }}
                            tickFormatter={(val) => {
                                const m = Math.floor(val / 60000);
                                return `${m}m`;
                            }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888888"
                            domain={[0, maxGraphValue]}
                            tick={{ fill: '#888888', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />

                        <Line hide={!activeLines.playerPlaced} type="monotone" dataKey="playerPlaced" name="Wards Posées" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2.5, fill: '#0ea5e9', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#0ea5e9', stroke: '#050505', strokeWidth: 2 }} isAnimationActive={false} />
                        <Line hide={!activeLines.playerKilled} type="monotone" dataKey="playerKilled" name="Wards Détruites" stroke="#38bdf8" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2.5, fill: '#38bdf8', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#38bdf8', stroke: '#050505', strokeWidth: 2 }} isAnimationActive={false} />
                        <Line hide={!activeLines.oppPlaced} type="monotone" dataKey="oppPlaced" name="Wards Ennemies" stroke="#ef4444" strokeWidth={2} dot={{ r: 2.5, fill: '#ef4444', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#ef4444', stroke: '#050505', strokeWidth: 2 }} isAnimationActive={false} />
                        <Line hide={!activeLines.oppKilled} type="monotone" dataKey="oppKilled" name="Wards Détruites (Adv)" stroke="#f87171" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2.5, fill: '#f87171', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#f87171', stroke: '#050505', strokeWidth: 2 }} isAnimationActive={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default SupportVisionChart;