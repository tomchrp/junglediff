/**
 * ============================================================================
 * FICHIER : frontend/src/components/synergies/MatchupTimeChart.jsx
 * ============================================================================
 */
import React from 'react';
import {
    ResponsiveContainer,
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Legend
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const hasPlayerData = data.player_matches > 0;

        return (
            <div className="bg-surface-solid border border-border-strong rounded shadow-lg p-3 text-xs min-w-[200px]">
                <p className="font-bold text-gray-200 mb-2 pb-1 border-b border-border-glass">
                    Autour de {label} minutes
                </p>
                <div className="flex flex-col gap-2">
                    <div>
                        <p className="text-lol-gold font-bold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-lol-gold inline-block"></span>
                            Joueur : {hasPlayerData ? `${data.player_winrate}%` : 'Aucune partie'}
                        </p>
                        {hasPlayerData && (
                            <p className="text-gray-400 pl-4 mt-0.5">
                                ({data.player_wins}V / {data.player_matches} parties)
                            </p>
                        )}
                    </div>
                    <div>
                        <p className="text-gray-300 font-bold flex items-center gap-1.5 mt-1">
                            <span className="w-2 h-2 rounded-full bg-white/30 inline-block"></span>
                            Communauté : {data.global_winrate}%
                        </p>
                        <p className="text-gray-500 pl-4 mt-0.5">
                            ({data.global_matches} parties)
                        </p>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export default function MatchupTimeChart({ timeline }) {
    if (!timeline || timeline.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center text-lol-textMuted text-xs italic">
                Données temporelles insuffisantes
            </div>
        );
    }

    return (
        <div className="h-40 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={timeline}
                    margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                >
                    <CartesianGrid stroke="#ffffff" strokeOpacity={0.05} vertical={false} />

                    <XAxis
                        dataKey="bucket"
                        tickFormatter={(value) => `${value}m`}
                        tick={{ fill: '#888888', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        dy={8}
                    />

                    <YAxis
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        tickFormatter={(value) => `${value}%`}
                        tick={{ fill: '#888888', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                    />

                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff', strokeOpacity: 0.1, strokeWidth: 2 }} />

                    <Legend
                        verticalAlign="top"
                        height={24}
                        wrapperStyle={{ fontSize: '11px', color: '#888' }}
                        iconType="circle"
                    />

                    {/* Montagne Communautaire */}
                    <Area
                        name="Référentiel Communauté"
                        type="monotone"
                        dataKey="global_winrate"
                        fill="#ffffff"
                        fillOpacity={0.05}
                        stroke="#ffffff"
                        strokeOpacity={0.2}
                        isAnimationActive={false}
                    />

                    {/* Ligne Joueur lissée */}
                    <Line
                        name="Performances Joueur"
                        type="monotone"
                        dataKey="player_winrate"
                        stroke="#C89B3C"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#C89B3C', stroke: '#111', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#fff' }}
                        connectNulls={true}
                        isAnimationActive={false}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}