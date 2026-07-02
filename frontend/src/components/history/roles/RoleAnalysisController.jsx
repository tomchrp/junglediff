/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/roles/RoleAnalysisController.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Orchestrateur hybride pour l'analyse des rôles.
 * 100% piloté par la configuration (Configuration-Driven UI).
 * Il n'y a plus aucun import de vues expertes codées en dur.
 * 
 * MODIFICATIONS :
 * - Purge totale des anciens imports de la Jungle.
 * - Intégration de l'évaluation `isArchetypeMismatch` transmise au moteur 
 *   pour censurer les comparaisons de statistiques asymétriques.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RoleAnalysisDashboard from './shared/RoleAnalysisDashboard.jsx';
import DynamicExpertView from './shared/DynamicExpertView.jsx';
import { roleLayouts } from '../../../core/configs/roleLayouts.js';

// Dictionnaire de traduction des identifiants d'onglets pour l'interface utilisateur
const TAB_LABELS = {
    vision: 'Vision',
    combat: 'Combat',
    resources: 'Ressources',
    objectives: 'Objectifs'
};

const RoleAnalysisController = ({ matchId, puuid, role, isTimelineLoading, versionDDragon }) => {
    const [analysisData, setAnalysisData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let pollingInterval;
        const abortController = new AbortController();

        const fetchAnalysis = async () => {
            try {
                const response = await axios.get(
                    `http://localhost:8000/api/v1/matches/${matchId}/analysis/${role}?puuid=${puuid}`,
                    { signal: abortController.signal }
                );

                if (response.data.status === 'ready') {
                    setAnalysisData(response.data.data);
                    setIsLoading(false);
                    if (pollingInterval) clearInterval(pollingInterval);
                }
            } catch (err) {
                if (!axios.isCancel(err)) {
                    setError("Impossible de charger les statistiques détaillées pour ce rôle.");
                    setIsLoading(false);
                    if (pollingInterval) clearInterval(pollingInterval);
                }
            }
        };

        if (!isTimelineLoading) {
            fetchAnalysis();
            pollingInterval = setInterval(fetchAnalysis, 3000);
        }

        return () => {
            abortController.abort();
            if (pollingInterval) clearInterval(pollingInterval);
        };
    }, [matchId, puuid, role, isTimelineLoading]);

    if (isLoading || isTimelineLoading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center text-lol-textMuted text-sm font-medium animate-pulse">
                <div className="w-8 h-8 border-2 border-lol-info border-t-transparent rounded-full animate-spin mb-4"></div>
                Traitement de l'empreinte en cours...
            </div>
        );
    }

    if (error) return <div className="p-4 text-center text-lol-loss text-sm font-bold">{error}</div>;

    const { metadata, radar_data, insights, tabs_data } = analysisData;
    const currentRoleLayout = roleLayouts[metadata.role]?.[metadata.archetype];

    // Détection du conflit d'archétype sur la lane pour la censure des Deltas
    const isArchetypeMismatch = metadata.opponentArchetype
        ? metadata.archetype !== metadata.opponentArchetype
        : false;

    let tabsConfig = [];

    if (currentRoleLayout) {
        tabsConfig = Object.keys(currentRoleLayout).map(tabKey => ({
            id: tabKey,
            label: TAB_LABELS[tabKey] || tabKey.toUpperCase(),
            content: (
                <DynamicExpertView
                    layout={currentRoleLayout[tabKey]}
                    data={tabs_data[tabKey]}
                    versionDDragon={versionDDragon}
                    isMismatch={isArchetypeMismatch}
                />
            )
        }));
    } else {
        tabsConfig = [
            { id: 'error', label: 'Indisponible', content: <div className="p-4 text-center text-lol-textMuted">Vue experte en cours de construction pour ce rôle ou archétype.</div> }
        ];
    }

    return (
        <div className="flex flex-col gap-4 p-2">
            <div className="flex justify-between items-center px-2 pb-2 border-b border-border-glass">
                <h4 className="text-gray-100 font-bold uppercase tracking-wider text-sm">
                    Empreinte {metadata.role || role}
                </h4>
                {metadata.archetype && (
                    <span className="text-lol-gold text-xs font-bold px-2 py-1 bg-surface-solid rounded border border-border-strong uppercase">
                        Archétype : {metadata.archetype}
                    </span>
                )}
            </div>

            <RoleAnalysisDashboard
                radarData={radar_data}
                insights={insights}
                tabsConfig={tabsConfig}
            />
        </div>
    );
};

export default RoleAnalysisController;