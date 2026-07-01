/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/roles/support/SupportCombatChart.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Graphe temporel dédié au combat pour le rôle de Support. 
 * * CORRECTIONS SYSTEM DESIGN :
 * - Courbe principale en #0ea5e9 (text-lol-info).
 * - Icônes centrées mathématiquement (transform-origin) pour un zoom parfait.
 * - AJOUT : Ligne de tendance de DPM. Relie géométriquement par un segment 
 * droit (type="linear") l'origine, les points d'achats, et la fin de partie, 
 * via l'interpolation connectNulls=true.
 * ============================================================================
 */

import React, { useMemo } from 'react';
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
        // On récupère les données de la courbe principale (pas la trendline)
        const data = payload.find(p => p.dataKey === 'totalDamage')?.payload || payload[0].payload;
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

    // Génération de la donnée fantôme "trendDamage" pour les droites d'accélération
    const processedData = useMemo(() => {
        if (!chartData || chartData.length === 0) return [];

        return chartData.map((point, index) => {
            const isFirst = index === 0;
            const isLast = index === chartData.length - 1;
            const hasItem = point.itemIds && point.itemIds.length > 0;

            return {
                ...point,
                // On n'attribue une valeur que sur les points d'inflexion
                trendDamage: (isFirst || isLast || hasItem) ? point.totalDamage : null
            };
        });
    }, [chartData]);

    if (!processedData || processedData.length === 0) {
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
                        data={processedData}
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

                        {/* 1. La Ligne de Tendance (placée en premier pour être dessinée SOUS la courbe principale) */}
                        <Line
                            type="linear" // Trace des droites mathématiques parfaites
                            dataKey="trendDamage"
                            name="Tendance DPM"
                            stroke="#666666" // Gris neutre discret
                            strokeWidth={1}
                            strokeDasharray="5 5"
                            connectNulls={true} // Astuce clé : ignore les nulls pour lier les achats
                            dot={false}
                            activeDot={false}
                            isAnimationActive={false}
                        />

                        {/* 2. La Courbe Principale (Dégâts lissés) */}
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