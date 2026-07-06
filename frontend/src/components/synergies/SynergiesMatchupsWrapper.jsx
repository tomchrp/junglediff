/**
 * ============================================================================
 * FICHIER : frontend/src/components/synergies/SynergiesMatchupsWrapper.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Contrôleur de la vue Synergies et Matchups. Il orchestre la récupération
 * des données, gère les états de filtrage et transmet les props aux grilles
 * et graphiques.
 * * MODIFICATIONS :
 * - Correction d'une erreur de référence fantôme. L'application utilise 
 * exclusivement l'utilitaire getWinrateColorClass pour colorer les pourcentages.
 * ============================================================================
 */
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import SubViewSelector from './SubViewSelector.jsx';
import LaneGrid from './LaneGrid.jsx';
import Avatar from '../ui/Avatar.jsx';
import MatchupTimeChart from './MatchupTimeChart.jsx';

const LANE_NAMES = {
    TOP: 'TOP',
    JUNGLE: 'JUNGLE',
    MIDDLE: 'MID',
    BOTTOM: 'ADC',
    UTILITY: 'SUPPORT'
};

/**
 * Détermine la classe CSS de couleur textuelle en fonction du taux de victoire.
 * @param {number} wr - Le winrate à évaluer.
 * @returns {string} La classe Tailwind correspondante (victoire ou défaite).
 */
const getWinrateColorClass = (wr) => {
    return wr >= 50 ? 'text-lol-win' : 'text-lol-loss';
};

export default function SynergiesMatchupsWrapper({
    puuid,
    laneFilter,
    timeFilter,
    recentCount,
    versionDDragon,
    championMap,
    selectedChampion
}) {
    const [activeSubView, setActiveSubView] = useState('SYNERGIES');
    const [isLoading, setIsLoading] = useState(false);
    const [analyticsData, setAnalyticsData] = useState({ TOP: [], JUNGLE: [], MIDDLE: [], BOTTOM: [], UTILITY: [] });
    const [selectedMatchup, setSelectedMatchup] = useState(null);

    const selectedChampionIdRef = useRef(null);

    useEffect(() => {
        selectedChampionIdRef.current = selectedMatchup?.champion_id;
    }, [selectedMatchup]);

    /**
     * Gère la récupération asynchrone des données d'analyse croisée et la 
     * persistance de la sélection utilisateur.
     * Cette fonction construit l'URL avec les paramètres dynamiques,
     * gère l'annulation des requêtes obsolètes en plein vol (AbortController),
     * met à jour le state des données, puis tente de retrouver et restaurer 
     * le champion précédemment sélectionné dans le nouveau set de données 
     * pour éviter que le panneau de détail ne se ferme inopinément.
     */
    useEffect(() => {
        if (laneFilter === 'ALL') return;

        const abortController = new AbortController();

        const fetchAnalytics = async () => {
            setIsLoading(true);
            try {
                let url = `http://localhost:8000/api/v1/synergies/${puuid}/matchups?lane=${laneFilter}&type=${activeSubView}&time_filter=${timeFilter}&recent_count=${recentCount}`;

                if (selectedChampion) {
                    url += `&champion_id=${selectedChampion}`;
                }

                const response = await axios.get(url, { signal: abortController.signal });
                const newData = response.data.data;
                setAnalyticsData(newData);

                const currentId = selectedChampionIdRef.current;
                if (currentId) {
                    let foundMatchup = null;
                    let foundLane = null;

                    for (const [laneKey, laneArray] of Object.entries(newData)) {
                        const match = laneArray.find(c => c.champion_id === currentId);
                        if (match) {
                            foundMatchup = match;
                            foundLane = laneKey;
                            break;
                        }
                    }

                    if (foundMatchup) {
                        setSelectedMatchup({ ...foundMatchup, targetLane: foundLane });
                    } else {
                        setSelectedMatchup(null);
                    }
                }

            } catch (error) {
                if (!axios.isCancel(error)) {
                    console.error("Erreur API:", error);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalytics();

        return () => abortController.abort();
    }, [puuid, laneFilter, activeSubView, timeFilter, recentCount, selectedChampion]);

    /**
     * Construit dynamiquement le titre descriptif du panneau de détail.
     * Interroge le dictionnaire des champions et croise la position du joueur
     * avec la position de la cible pour générer une phrase sémantique lisible
     * indiquant si la relation est une synergie (allié) ou un matchup (ennemi).
     */
    const getContextualTitle = () => {
        if (!selectedMatchup) return "";

        const playerLaneStr = LANE_NAMES[laneFilter] || laneFilter;
        const playerContext = selectedChampion
            ? `${championMap[selectedChampion]} ${playerLaneStr}`
            : playerLaneStr;

        const targetLaneStr = LANE_NAMES[selectedMatchup.targetLane] || selectedMatchup.targetLane;
        const targetContext = `${championMap[selectedMatchup.champion_id]} ${targetLaneStr}`;
        const relation = activeSubView === 'SYNERGIES' ? 'AVEC' : 'VS';

        return `${playerContext} ${relation} ${targetContext}`.toUpperCase();
    };

    if (laneFilter === 'ALL') {
        return (
            <div className="flex-1 glass-panel flex flex-col items-center justify-center p-8">
                <div className="text-center bg-surface-solid p-6 rounded-md border border-border-strong max-w-md shadow-glass">
                    <h2 className="text-xl font-bold text-lol-gold mb-2 uppercase tracking-widest">Action Requise</h2>
                    <p className="text-gray-100 text-sm">L'analyse des synergies et matchups nécessite un contexte strict.</p>
                </div>
            </div>
        );
    }

    let globalMatches = 0;
    let globalWinrate = 0;
    if (selectedMatchup) {
        globalMatches = selectedMatchup.timeline.reduce((acc, b) => acc + b.global_matches, 0);
        globalWinrate = parseFloat((selectedMatchup.player_stats.winrate - selectedMatchup.player_stats.delta).toFixed(1));
    }

    return (
        <div className="flex-1 glass-panel flex flex-col p-4 min-h-0 gap-4">
            <SubViewSelector activeView={activeSubView} onViewChange={setActiveSubView} />

            <div className={`transition-all duration-300 min-h-0 flex flex-col relative ${selectedMatchup ? 'basis-1/2' : 'basis-full'}`}>
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-app/80 backdrop-blur-sm z-10 rounded-md">
                        <span className="text-lol-gold font-bold tracking-widest uppercase animate-pulse">Calcul...</span>
                    </div>
                )}
                <LaneGrid
                    mode={activeSubView}
                    currentLane={laneFilter}
                    data={analyticsData}
                    versionDDragon={versionDDragon}
                    championMap={championMap}
                    selectedChampionId={selectedMatchup?.champion_id}
                    selectedTargetLane={selectedMatchup?.targetLane}
                    onSelectMatchup={setSelectedMatchup}
                />
            </div>

            {selectedMatchup && (
                <div className="basis-1/2 min-h-0 flex flex-col bg-surface-solid border border-lol-gold/40 rounded-md p-4 animate-in slide-in-from-bottom-4 shadow-glass">
                    <div className="flex justify-between items-start shrink-0 border-b border-border-glass pb-3 mb-3">
                        <div className="flex items-center gap-4">
                            <Avatar
                                src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/champion/${championMap[selectedMatchup.champion_id].replace(/\s+/g, '')}.png`}
                                size="base"
                                type="champion"
                            />
                            <div className="flex flex-col gap-1">
                                <h3 className="text-lol-gold font-bold text-sm tracking-widest uppercase">
                                    {getContextualTitle()}
                                </h3>
                                <p className="text-gray-300 text-xs font-medium flex flex-wrap items-center gap-2">
                                    <span>
                                        Joueur : <span className="text-white font-bold">{selectedMatchup.player_stats.matches} parties</span>
                                        {' '}(<span className={`font-bold ${getWinrateColorClass(selectedMatchup.player_stats.winrate)}`}>{selectedMatchup.player_stats.winrate.toFixed(1)}%</span>)
                                    </span>
                                    <span className="text-border-glass">|</span>
                                    <span title="Référentiel exact de cette paire (Indépendant du joueur)">
                                        Communauté : <span className="text-white font-bold">{globalMatches} parties</span>
                                        {' '}(<span className={`font-bold ${getWinrateColorClass(globalWinrate)}`}>{globalWinrate}%</span>)
                                    </span>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedMatchup(null)}
                            className="text-gray-500 hover:text-red-400 transition-colors p-1 px-3 rounded hover:bg-white/5 text-lg font-bold"
                            title="Fermer l'analyse"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="flex-1 min-h-0">
                        <MatchupTimeChart timeline={selectedMatchup.timeline} />
                    </div>
                </div>
            )}
        </div>
    );
}