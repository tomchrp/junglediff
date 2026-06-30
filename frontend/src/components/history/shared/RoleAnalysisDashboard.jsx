/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/shared/RoleAnalysisDashboard.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Hub Central Agnostique pour l'analyse de rôle.
 * Implémente le pattern "Progressive Disclosure" : Aperçu (Radar) -> 
 * Navigation (Pills) -> Détails (Vues enfants injectées).
 * Ce composant ne contient aucune logique métier liée à League of Legends.
 * ============================================================================
 */

import React, { useState } from 'react';
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

const RoleAnalysisDashboard = ({ radarData, insights, tabsConfig }) => {
    // L'onglet 'overview' est le Graphe Radar par défaut
    const [activeTab, setActiveTab] = useState('overview');

    const activeConfig = tabsConfig.find(t => t.id === activeTab);

    return (
        <div className="flex flex-col gap-4 w-full">
            {/* SECTION 1 : Le Narratif Automatisé (Insights) */}
            <div className="flex flex-wrap gap-2 justify-center px-2">
                {insights.map((insight, idx) => (
                    <div
                        key={idx}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider border ${insight.type === 'positive'
                                ? 'bg-lol-win/10 text-lol-win border-lol-win/30'
                                : 'bg-lol-loss/10 text-lol-loss border-lol-loss/30'
                            }`}
                        title={insight.description}
                    >
                        <span>{insight.icon}</span>
                        <span>{insight.title}</span>
                    </div>
                ))}
            </div>

            {/* SECTION 2 : La Zone d'Affichage Principale (Radar ou Détail) */}
            <div className="min-h-[280px] w-full relative transition-all duration-300">
                {activeTab === 'overview' ? (
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
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
                    </div>
                ) : (
                    <div className="animate-in fade-in zoom-in-95 duration-200">
                        {activeConfig?.content}
                    </div>
                )}
            </div>

            {/* SECTION 3 : La Barre de Navigation (Pills) */}
            <div className="flex flex-wrap justify-center gap-2 mt-2 pt-3 border-t border-border-glass">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-colors ${activeTab === 'overview'
                            ? 'bg-lol-info text-white'
                            : 'bg-surface-solid text-lol-textMuted hover:text-gray-200 border border-border-glass'
                        }`}
                >
                    Radar Global
                </button>

                {tabsConfig.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase flex items-center gap-1.5 transition-colors ${activeTab === tab.id
                                ? 'bg-lol-info text-white'
                                : 'bg-surface-solid text-lol-textMuted hover:text-gray-200 border border-border-glass'
                            }`}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default RoleAnalysisDashboard;