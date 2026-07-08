/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/roles/shared/RoleAnalysisDashboard.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Hub Central Agnostique pour l'analyse de rôle.
 * Implémente le pattern "Progressive Disclosure" : Aperçu (Radar) -> 
 * Navigation (Pills) -> Détails (Vues enfants injectées).
 * * MODIFICATIONS (Phase 4.5 Refacto) :
 * - Délégation totale du rendu du radar au composant ComparisonRadarChart.
 * - Suppression des dépendances directes à Recharts (purification du code).
 * ============================================================================
 */
import React, { useState } from 'react';
import ComparisonRadarChart from '../../../ui/charts/ComparisonRadarChart.jsx';

export default function RoleAnalysisDashboard({ radarData, insights, tabsConfig }) {
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
                        <ComparisonRadarChart data={radarData} />
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
}