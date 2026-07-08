/**
 * ============================================================================
 * FICHIER : frontend/src/components/synergies/SynergiesMatchupsWrapper.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Contrôleur principal de la vue Synergies et Matchups (Smart Component).
 * Gère l'état global de la vue, orchestre les requêtes réseau vers le Data Lake,
 * maintient la persistance du contexte lors des changements de filtres, et assemble
 * les primitives de mise en page (SplitDataViewLayout, DetailConsole).
 * * MODIFICATIONS (Phase 3.5 Refacto) :
 * - Suppression totale du code de mise en page redondant.
 * - Délégation du conteneur de graphique à DetailConsole.
 * - Délégation du layout Flexbox à SplitDataViewLayout.
 * ============================================================================
 */
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import SubViewSelector from './SubViewSelector.jsx';
import LaneGrid from './LaneGrid.jsx';
import UniversalTimelineChart from '../ui/charts/UniversalTimelineChart.jsx';
import SplitDataViewLayout from '../layouts/SplitDataViewLayout.jsx';
import DetailConsole from '../ui/DetailConsole.jsx';
import { getWinrateColorClass } from '../../core/utils/formatters.js';

const LANE_NAMES = {
    TOP: 'TOP',
    JUNGLE: 'JUNGLE',
    MIDDLE: 'MID',
    BOTTOM: 'ADC',
    UTILITY: 'SUPPORT'
};

/**
 * Composant de bulle d'information (Tooltip) injecté dans le graphique Recharts.
 * Affiche le taux de victoire croisé entre le référentiel de la communauté et 
 * les statistiques personnelles du joueur pour une tranche de temps donnée.
 */
const CustomMatchupTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const hasPlayerData = data.player_matches > 0;

        return (
            <div className="bg-surface-solid border border-border-strong rounded shadow-lg p-3 text-xs min-w-[200px] z-50">
                <p className="font-bold text-gray-200 mb-2 pb-1 border-b border-border-glass">
                    Autour de {label} minutes
                </p>
                <div className="flex flex-col gap-2">
                    <div>
                        <p className="text-lol-gold font-bold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-lol-gold inline-block"></span>
                            Joueur : {hasPlayerData ? `${data.player_winrate}%` : 'Aucune partie'}
                        </p>
                        {hasPlayerData && <p className="text-gray-400 pl-4 mt-0.5">({data.player_wins}V / {data.player_matches} parties)</p>}
                    </div>
                    <div>
                        <p className="text-gray-300 font-bold flex items-center gap-1.5 mt-1">
                            <span className="w-2 h-2 rounded-full bg-white/30 inline-block"></span>
                            Communauté : {data.global_winrate}%
                        </p>
                        <p className="text-gray-500 pl-4 mt-0.5">({data.global_matches} parties)</p>
                    </div>
                </div>
            </div>
        );
    }
    return null;
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
     * Construit l'URL avec les paramètres dynamiques, gère l'annulation des 
     * requêtes obsolètes en plein vol (AbortController), met à jour le state 
     * des données, puis tente de retrouver et restaurer le champion précédemment 
     * sélectionné dans le nouveau set de données pour éviter que le panneau 
     * de détail ne se ferme inopinément lors d'un changement de filtre.
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
    let playerAvatarSrc = null;
    let targetAvatarSrc = null;

    if (selectedMatchup) {
        globalMatches = selectedMatchup.timeline.reduce((acc, b) => acc + b.global_matches, 0);
        globalWinrate = parseFloat((selectedMatchup.player_stats.winrate - selectedMatchup.player_stats.delta).toFixed(1));

        targetAvatarSrc = `https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/champion/${championMap[selectedMatchup.champion_id].replace(/\s+/g, '')}.png`;
        if (selectedChampion) {
            playerAvatarSrc = `https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/champion/${championMap[selectedChampion].replace(/\s+/g, '')}.png`;
        }
    }

    const masterContent = (
        <>
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
        </>
    );

    const detailContent = selectedMatchup ? (
        <DetailConsole
            onClose={() => setSelectedMatchup(null)}
            leftAvatar={playerAvatarSrc || targetAvatarSrc}
            rightAvatar={playerAvatarSrc ? targetAvatarSrc : null}
            title={getContextualTitle()}
            subtitle={
                <div className="flex flex-wrap items-center gap-2">
                    <span>
                        Joueur : <span className="text-white font-bold">{selectedMatchup.player_stats.matches} parties</span>
                        {' '}(<span className={`font-bold ${getWinrateColorClass(selectedMatchup.player_stats.winrate)}`}>{selectedMatchup.player_stats.winrate.toFixed(1)}%</span>)
                    </span>
                    <span className="text-border-glass">|</span>
                    <span title="Référentiel exact de cette paire (Indépendant du joueur)">
                        Communauté : <span className="text-white font-bold">{globalMatches} parties</span>
                        {' '}(<span className={`font-bold ${getWinrateColorClass(globalWinrate)}`}>{globalWinrate}%</span>)
                    </span>
                </div>
            }
        >
            <UniversalTimelineChart
                height="h-full"
                data={selectedMatchup.timeline}
                xAxisKey="bucket"
                formatXAxis={(value) => `${value}m`}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                customTooltip={<CustomMatchupTooltip />}
                yAxisConfig={{
                    domain: [0, 100],
                    ticks: [0, 25, 50, 75, 100],
                    tickFormatter: (value) => `${value}%`
                }}
                areas={[
                    {
                        name: "Référentiel Communauté",
                        dataKey: "global_winrate",
                        fill: "#ffffff",
                        fillOpacity: 0.05,
                        stroke: "#ffffff",
                        strokeOpacity: 0.2
                    }
                ]}
                lines={[
                    {
                        name: "Performances Joueur",
                        dataKey: "player_winrate",
                        color: "#C89B3C",
                        strokeWidth: 3,
                        dot: { r: 4, fill: '#C89B3C', stroke: '#111', strokeWidth: 2 },
                        activeDot: { r: 6, fill: '#fff' },
                        connectNulls: true
                    }
                ]}
            />
        </DetailConsole>
    ) : null;

    return (
        <div className="flex-1 glass-panel flex flex-col p-4 min-h-0 gap-4">
            <SubViewSelector activeView={activeSubView} onViewChange={setActiveSubView} />
            <SplitDataViewLayout
                masterContent={masterContent}
                detailContent={detailContent}
                isDetailOpen={!!selectedMatchup}
                detailContainerClassName=""
            />
        </div>
    );
}