/**
 * ============================================================================
 * FICHIER : frontend/src/components/synergies/MatchupTimeChart.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Composant de Data-Visualization expert exploitant Recharts. 
 * Affiche la superposition de deux dimensions temporelles :
 * 1. Une aire continue (Area) représentant la "Montagne" communautaire globale.
 * 2. Un diagramme en barres discrètes (Bar) représentant les performances 
 *    spécifiques du joueur par tranches de 5 minutes.
 * 
 * Ce composant est purement "dumb" (Configuration-Driven). Il attend un 
 * payload pré-formaté par le SynergyOrchestrator du backend.
 * ============================================================================
 */
import React from 'react';
import {
    ResponsiveContainer,
    ComposedChart,
    Area,
    Bar,
    XAxis,
    YAxis,
    Tooltip
} from 'recharts';

/**
 * CustomTooltip
 * 
 * Fonction complexe : Surcharge le comportement par défaut de l'infobulle Recharts.
 * Elle intercepte le payload actif lors du survol d'une tranche temporelle
 * et reformate les données pour afficher un comparatif clair (Joueur vs Communauté)
 * avec les volumes exacts de parties jouées pour justifier les pourcentages.
 */
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        // payload[0] correspond généralement à la Montagne (Area)
        // payload[1] correspond aux Barres (Joueur), s'il y a des données pour cette tranche
        const data = payload[0].payload;

        return (
            <div className="bg-surface-solid border border-border-strong rounded shadow-lg p-2 text-xs">
                <p className="font-bold text-gray-200 mb-1 pb-1 border-b border-border-glass">
                    Tranche : {label} - {Number(label) + 5} min
                </p>
                <div className="flex flex-col gap-1 mt-2">
                    <p className="text-lol-info font-semibold">
                        Joueur : {data.player_winrate !== null ? `${data.player_winrate}%` : 'N/A'}
                    </p>
                    {data.player_matches > 0 && (
                        <p className="text-gray-400 pl-2">
                            ({data.player_wins} / {data.player_matches} victoires)
                        </p>
                    )}
                    <p className="text-gray-300 font-semibold mt-1">
                        Communauté : {data.global_winrate}%
                    </p>
                    <p className="text-gray-500 pl-2">
                        ({data.global_matches} parties)
                    </p>
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
        <div className="h-32 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={timeline}
                    margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
                >
                    <XAxis
                        dataKey="bucket"
                        tickFormatter={(value) => `${value}m`}
                        tick={{ fill: '#888888', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        dy={5}
                    />
                    {/* YAxis masqué pour épurer l'interface, mais domaine forcé de 0 à 100 */}
                    <YAxis
                        domain={[0, 100]}
                        hide={true}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff', opacity: 0.05 }} />

                    {/* Série 1 : La Montagne Communautaire */}
                    <Area
                        type="monotone"
                        dataKey="global_winrate"
                        fill="#ffffff"
                        fillOpacity={0.05}
                        stroke="#ffffff"
                        strokeOpacity={0.2}
                        isAnimationActive={false}
                    />

                    {/* Série 2 : Les Barres du Joueur */}
                    <Bar
                        dataKey="player_winrate"
                        barSize={12}
                        fill="#00a0db"
                        radius={[2, 2, 0, 0]}
                        isAnimationActive={false}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}