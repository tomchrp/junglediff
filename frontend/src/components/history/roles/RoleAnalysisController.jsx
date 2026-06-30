/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/roles/RoleAnalysisController.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Orchestrateur unique pour l'analyse des rôles (Jungle, Support, etc.).
 * Ce composant agit comme un routeur de données :
 * 1. Il intercepte le statut de chargement de la timeline (géré par MatchCard).
 * 2. Il interroge l'endpoint générique /api/v1/matches/{id}/analysis/{role}.
 * 3. Il configure dynamiquement les onglets (Vues Expertes) en fonction du rôle.
 * 4. Il injecte le contrat JSON strict dans le Hub Agnostique (RoleAnalysisDashboard).
 * * Ce fichier est totalement aveugle aux règles métier de League of Legends.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RoleAnalysisDashboard from './shared/RoleAnalysisDashboard.jsx';

// Imports des vues expertes (Dumb Components)
import SupportVisionView from './support/SupportVisionView.jsx';
import SupportCombatView from './support/SupportCombatView.jsx';
import JungleResourcesView from './jungle/JungleResourcesView.jsx';
import JungleObjectivesView from './jungle/JungleObjectivesView.jsx';
import JungleCombatView from './jungle/JungleCombatView.jsx';
import JungleVisionView from './jungle/JungleVisionView.jsx';
// Importe les autres vues Jungle ici au fur et à mesure de leur création

const RoleAnalysisController = ({ matchId, puuid, role, isTimelineLoading }) => {
    const [analysisData, setAnalysisData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * Cycle de vie réseau pour la récupération de l'empreinte analytique.
     * Attend obligatoirement que l'ingestion de la timeline (isTimelineLoading) 
     * soit terminée avant de solliciter le calcul backend.
     */
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
            // Polling léger pour gérer les éventuels retards de calcul asynchrone côté serveur
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
                Traitement de l'empreinte {role} en cours...
            </div>
        );
    }

    if (error) return <div className="p-4 text-center text-lol-loss text-sm font-bold">{error}</div>;

    const { metadata, radar_data, insights, tabs_data } = analysisData;

    /**
     * Configuration dynamique des onglets en fonction du rôle analysé.
     * Chaque vue experte reçoit uniquement le fragment de données dont elle a besoin.
     */
    let tabsConfig = [];

    if (role === 'UTILITY') {
        tabsConfig = [
            // Standardisation du nom de la prop en "data" pour correspondre au design pattern du Jungle
            { id: 'vision', label: 'Vision', content: <SupportVisionView data={tabs_data.vision} /> },
            { id: 'combat', label: 'Combat', content: <SupportCombatView data={tabs_data.combat} archetype={metadata.archetype} /> }
        ];
    } else if (role === 'JUNGLE') {
        tabsConfig = [
            { id: 'resources', label: 'Ressources', content: <JungleResourcesView data={tabs_data.resources} /> },
            { id: 'objectives', label: 'Objectifs', content: <JungleObjectivesView data={tabs_data.objectives} /> },
            { id: 'combat', label: 'Combat', content: <JungleCombatView data={tabs_data.combat} /> },
            { id: 'vision', label: 'Vision', content: <JungleVisionView data={tabs_data.vision} /> }
        ];
    }

    return (
        <div className="flex flex-col gap-4 p-2">
            <div className="flex justify-between items-center px-2 pb-2 border-b border-border-glass">
                <h4 className="text-gray-100 font-bold uppercase tracking-wider text-sm">
                    Empreinte {role}
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