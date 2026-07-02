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
 * MODIFICATIONS RÉCENTES :
 * - Correction du contrat de données : les onglets sont extraits directement
 *   à la racine de analysisData via l'opérateur rest.
 * - Implémentation d'un Early Return strict ("Bouclier") qui empêche le crash
 *   du composant si un archétype n'est pas encore enregistré dans le registre.
 * - Intégration de l'évaluation `isArchetypeMismatch` transmise au moteur 
 *   pour censurer les comparaisons de statistiques asymétriques.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RoleAnalysisDashboard from './shared/RoleAnalysisDashboard.jsx';
import DynamicExpertView from './shared/DynamicExpertView.jsx';
import { roleLayouts } from '../../../core/configs/layouts/index.js';

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

    /**
     * useEffect - fetchAnalysis
     * 
     * DESCRIPTION :
     * Gère la récupération asynchrone des données d'analyse experte depuis l'API.
     * Implémente un mécanisme de polling (requêtes répétées) toutes les 3 secondes
     * si le backend indique que les données ne sont pas encore prêtes. 
     * Utilise AbortController pour annuler la requête si le composant est démonté.
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

                if (response.data.status === 'ready' || response.data.metadata) {
                    // Si l'orchestrateur renvoie directement les données (sans worker), metadata est présent
                    setAnalysisData(response.data.data || response.data);
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
            // Le polling peut être retiré à terme si le traitement est 100% synchrone
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

    // Extraction dynamique : tabsData regroupe toutes les clés (vision, combat, etc.) qui ne sont pas explicitement nommées
    const { metadata, radar_data, insights, ...tabsData } = analysisData;
    const currentRoleLayout = roleLayouts[metadata.role]?.[metadata.archetype];

    // Sécurité (Early Return) : Si l'archétype est inconnu ou en cours de dev, on stoppe le rendu ici
    if (!currentRoleLayout) {
        return (
            <div className="flex flex-col gap-4 p-2">
                <div className="flex justify-between items-center px-2 pb-2 border-b border-border-glass">
                    <h4 className="text-gray-100 font-bold uppercase tracking-wider text-sm">
                        Empreinte {metadata?.role || role}
                    </h4>
                </div>
                <div className="flex items-center justify-center p-8 text-gray-400 bg-lol-dark-blue rounded-lg border border-gray-700">
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-gray-200 mb-2">Vue Experte Indisponible</h3>
                        <p>L'analyse détaillée pour l'archétype <span className="font-semibold text-lol-gold">{metadata?.archetype || 'INCONNU'}</span> est en cours de construction.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Détection du conflit d'archétype sur la lane pour la censure des Deltas
    const isArchetypeMismatch = metadata.opponentArchetype
        ? metadata.archetype !== metadata.opponentArchetype
        : false;

    // Mapping du layout de l'archétype sur le composant DynamicExpertView
    const tabsConfig = Object.keys(currentRoleLayout).map(tabKey => ({
        id: tabKey,
        label: TAB_LABELS[tabKey] || tabKey.toUpperCase(),
        content: (
            <DynamicExpertView
                layout={currentRoleLayout[tabKey]}
                data={tabsData[tabKey]}
                versionDDragon={versionDDragon}
                isMismatch={isArchetypeMismatch}
            />
        )
    }));

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