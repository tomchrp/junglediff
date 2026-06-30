/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/support/MatchCardRoleSupport.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Orchestrateur Métier du Rôle Support.
 * 1. Maintient le polling vers l'API.
 * 2. Transforme les données brutes de vision et combat en scores sur 100 (Radar).
 * 3. Évalue les performances pour générer les Insights (Narratif).
 * 4. Configure les onglets et délègue l'affichage au RoleAnalysisDashboard.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import supportArchetypes from '../../../utils/support_archetypes.json';
import RoleAnalysisDashboard from '../shared/RoleAnalysisDashboard.jsx';
import SupportVisionView from './SupportVisionView.jsx';
import SupportCombatView from './SupportCombatView.jsx';

const MatchCardRoleSupport = ({ match, currentPlayer, opponent, isTimelineLoading }) => {
    const [analysisData, setAnalysisData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const matchId = match.metadata?.matchId || match.match_id;
    const puuid = currentPlayer.puuid;
    const championId = currentPlayer.championId.toString();
    const archetype = supportArchetypes[championId] || "NON DEFINI";

    /**
     * Gère le cycle de vie réseau pour la récupération de l'empreinte de rôle.
     * Effectue des requêtes répétées (Polling) et s'interrompt si la donnée 
     * est prête ou si le composant est démonté.
     */
    useEffect(() => {
        let pollingInterval;
        const abortController = new AbortController();

        const fetchAnalysis = async () => {
            try {
                const response = await axios.get(
                    `http://localhost:8000/api/v1/matches/${matchId}/analysis/support?puuid=${puuid}`,
                    { signal: abortController.signal }
                );

                if (response.data.status === 'ready') {
                    setAnalysisData(response.data.data);
                    setIsLoading(false);
                    if (pollingInterval) clearInterval(pollingInterval);
                }
            } catch (err) {
                if (!axios.isCancel(err)) {
                    setError("Impossible de charger les statistiques detaillees.");
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
    }, [matchId, puuid, isTimelineLoading]);

    if (isLoading || isTimelineLoading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center text-lol-textMuted text-sm font-medium animate-pulse">
                <div className="w-8 h-8 border-2 border-lol-info border-t-transparent rounded-full animate-spin mb-4"></div>
                Traitement de l'empreinte Support en cours...
            </div>
        );
    }

    if (error) return <div className="p-4 text-center text-lol-loss text-sm font-bold">{error}</div>;

    // ========================================================================
    // LOGIQUE METIER : GENERATION DES DONNEES DU HUB
    // ========================================================================

    const summary = analysisData.summary;
    const combat = analysisData.combat;

    /**
     * Calcule le score normalise (sur 100) pour l'axe de la Vision.
     * Plafonne a 100 si le joueur depasse le seuil d'excellence (3.5 wards/min).
     */
    const calcVisionScore = (scorePerMin) => Math.min(100, Math.round((scorePerMin / 3.5) * 100));

    /**
     * Calcule le score normalise pour l'axe de Survie.
     * Deduit 10 points par mort, avec un minimum de 0.
     */
    const calcSurvivalScore = (deaths) => deaths === 0 ? 100 : Math.round(Math.max(0, 100 - (deaths * 10)));

    // 1. Calcul des scores du Radar avec les vraies donnees Agnostiques
    const radarData = [
        {
            axe: "Vision",
            scoreJoueur: calcVisionScore(summary.visionScorePerMinute),
            scoreAdversaire: calcVisionScore(summary.visionScorePerMinute - summary.visionScoreAdvantage)
        },
        {
            axe: "Presence",
            scoreJoueur: Math.round(combat.killParticipation * 100),
            scoreAdversaire: 50 // TODO: Ajouter KP adverse dans le backend
        },
        {
            axe: "Survie",
            scoreJoueur: calcSurvivalScore(combat.deaths),
            scoreAdversaire: 60 // TODO: Ajouter Morts adverses
        },
        { axe: "Utilitaire", scoreJoueur: 80, scoreAdversaire: 75 }, // Axes restants a developper
        { axe: "Pression", scoreJoueur: 55, scoreAdversaire: 85 }
    ];

    // 2. Generation du Narratif (Insights Automatises)
    const insights = [];

    if (summary.controlWardCoverage >= 0.6) {
        insights.push({ type: 'positive', title: 'Domination Spatiale', description: 'Excellent controle de la riviere et de la jungle ennemie.' });
    } else if (summary.controlWardCoverage < 0.2) {
        insights.push({ type: 'negative', title: 'Carte Aveugle', description: 'Penetration de vision extremement faible.' });
    }

    if (summary.visionScoreAdvantage > 0.5) {
        insights.push({ type: 'positive', title: 'Diff Vision', description: 'Ecrase le vis-a-vis sur le controle de la carte.' });
    }

    if (combat.killParticipation > 0.6) {
        insights.push({ type: 'positive', title: 'Omnipresent', description: 'Forte implication dans les combats d\'equipe.' });
    }

    // 3. Configuration des Vues Detaillee
    const tabsConfig = [
        {
            id: 'vision',
            label: 'Vision',
            content: <SupportVisionView analysisData={analysisData} />
        },
        {
            id: 'combat',
            label: 'Combat',
            content: <SupportCombatView combatData={combat} archetype={archetype} />
        }
    ];

    return (
        <div className="flex flex-col gap-4 p-2">
            <div className="flex justify-between items-center px-2 pb-2 border-b border-border-glass">
                <h4 className="text-gray-100 font-bold uppercase tracking-wider text-sm">
                    Empreinte Support
                </h4>
                <span className="text-lol-gold text-xs font-bold px-2 py-1 bg-surface-solid rounded border border-border-strong uppercase">
                    Archetype : {archetype}
                </span>
            </div>

            <RoleAnalysisDashboard
                radarData={radarData}
                insights={insights}
                tabsConfig={tabsConfig}
            />
        </div>
    );
};

export default MatchCardRoleSupport;