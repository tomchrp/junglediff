/**
 * ============================================================================
 * FICHIER : frontend/src/components/ui/charts/ComparisonRadarChart.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Primitive graphique isolée pour le rendu du Radar de comparaison (Joueur vs Adversaire).
 * Gère exclusivement la logique SVG via Recharts, purgeant ainsi le composant
 * parent (RoleAnalysisDashboard) de sa dette technique visuelle.
 * Préparé pour recevoir ultérieurement des effets visuels (Glassmorphism, Glow).
 * ============================================================================
 */
import React from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip
} from 'recharts';

/**
 * Tooltip personnalisé pour le graphe Radar.
 * Intercepte le survol des axes et affiche de façon lisible et structurée 
 * les scores du joueur et de l'adversaire dans une bulle sémantique.
 * * @param {boolean} active - État d'activation du tooltip (fourni par Recharts).
 * @param {Array} payload - Données du point survolé (fourni par Recharts).
 * @returns {JSX.Element|null} Le panneau d'information ou null si inactif.
 */
const RadarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-panel p-2 border border-border-glass text-xs min-w-[120px]">
                <p className="text-gray-100 font-bold mb-1 pb-1 border-b border-border-strong uppercase">
                    {payload[0].payload.axe}
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
 * Composant principal du graphique Radar.
 * Instancie la grille polaire, les axes et les polygones de données.
 * * @param {Array} data - Tableau d'objets contenant les axes et les scores 
 * (ex: [{ axe: 'Vision', scoreJoueur: 80, scoreAdversaire: 60 }]).
 * @returns {JSX.Element} Le conteneur SVG adaptatif.
 */
export default function ComparisonRadarChart({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="flex h-full w-full items-center justify-center text-lol-textMuted text-xs italic">
                Données radar indisponibles
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
                <PolarGrid stroke="#2A2A2A" />
                <PolarAngleAxis
                    dataKey="axe"
                    tick={{ fill: '#888888', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Tooltip content={<RadarTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />

                <Radar
                    name="Adversaire"
                    dataKey="scoreAdversaire"
                    stroke="#ff4e50"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    fill="#ff4e50"
                    fillOpacity={0.1}
                />
                <Radar
                    name="Joueur"
                    dataKey="scoreJoueur"
                    stroke="#00C896"
                    strokeWidth={2}
                    fill="#00C896"
                    fillOpacity={0.3}
                />
            </RadarChart>
        </ResponsiveContainer>
    );
}