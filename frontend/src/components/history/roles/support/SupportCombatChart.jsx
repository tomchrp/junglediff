/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/roles/support/SupportCombatChart.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Graphe temporel dédié au combat pour le rôle de Support. 
 * * CORRECTIONS SYSTEM DESIGN :
 * - Courbe alignée sur la couleur standard du joueur (#0ea5e9).
 * - Icônes centrées mathématiquement (transform-origin: 12px 12px) pour 
 * un effet de zoom parfait au survol sans décalage.
 * ============================================================================
 */

import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

/**
 * Composant personnalisé pour le rendu des points sur la courbe.
 */
const CustomItemDot = (props) => {
    const { cx, cy, payload } = props;

    if (!payload.itemIds || payload.itemIds.length === 0) {
        return null;
    }

    const itemId = payload.itemIds[0];
    const imgUrl = `https://ddragon.leagueoflegends.com/cdn/14.8.1/img/item/${itemId}.png`;

    return (
        <svg x={cx - 12} y={cy - 12} width={24} height={24} className="overflow-visible z-10">
            {/* L'ajout du transformOrigin centre le point de grossissement au milieu du SVG */}
            <g className="transition-transform duration-200 hover:scale-[1.4] cursor-pointer" style={{ transformOrigin: '12px 12px' }}>
                <image href={imgUrl} width={24} height={24} clipPath="circle(12px at center)" />
                <circle cx="12" cy="12" r="12" stroke="#eab308" strokeWidth="2" fill="none" />
            </g>
        </svg>
    );
};

const formatExactTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-surface-solid p-3 border border-border-glass text-xs rounded-md shadow-lg z-50">
                <p className="text-gray-100 font-bold mb-2 pb-1 border-b border-border-strong">
                    Temps : {formatExactTime(label)}
                </p>
                <div className="flex justify-between gap-4 py-0.5">
                    <span className="font-medium text-lol-info">Dégâts cumulés</span>
                    <span className="text-gray-100 font-bold tabular-nums">
                        {data.totalDamage.toLocaleString()}
                    </span>
                </div>
                {data.itemIds && data.itemIds.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border-strong text-lol-gold text-[10px] uppercase font-bold tracking-wider">
                        Power Spike (Achat majeur)
                    </div>
                )}
            </div>
        );
    }
    return null;
};

const SupportCombatChart = ({ chartData }) => {
    if (!chartData || chartData.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center border border-border-glass bg-surface-solid/50 rounded text-lol-textMuted text-xs">
                Données temporelles indisponibles
            </div>
        );
    }

    return (
        <div className="h-80 w-full bg-surface-solid border border-border-glass rounded-md p-3 flex flex-col">
            <h4 className="text-lol-textMuted font-bold uppercase tracking-wider text-[10px] mb-4 text-center">
                Évolution de la pression offensive
            </h4>

            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
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
                            tick={{ fill: '#888888', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}
                            tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#444', strokeWidth: 1, strokeDasharray: '5 5' }} />

                        {/* Remplacement du #2debb1 par la couleur standard text-lol-info (#0ea5e9) */}
                        <Line
                            type="monotone"
                            dataKey="totalDamage"
                            name="Dégâts Infligés"
                            stroke="#0ea5e9"
                            strokeWidth={3}
                            dot={<CustomItemDot />}
                            activeDot={false}
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default SupportCombatChart;