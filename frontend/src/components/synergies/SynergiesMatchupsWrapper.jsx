/**
 * ============================================================================
 * FICHIER : frontend/src/components/synergies/SynergiesMatchupsWrapper.jsx
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SubViewSelector from './SubViewSelector.jsx';
import LaneGrid from './LaneGrid.jsx';

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

    useEffect(() => {
        if (laneFilter === 'ALL') return;

        const abortController = new AbortController();

        const fetchAnalytics = async () => {
            setIsLoading(true);
            try {
                // CORRECTION : Nouvelle URL d'API et injection des paramètres de temps et de type
                let url = `http://localhost:8000/api/v1/synergies/${puuid}/matchups?lane=${laneFilter}&type=${activeSubView}&time_filter=${timeFilter}&recent_count=${recentCount}`;

                if (selectedChampion) {
                    url += `&champion_id=${selectedChampion}`;
                }

                const response = await axios.get(url, { signal: abortController.signal });
                // Le backend renvoie maintenant l'objet sous response.data.data.matchups
                // Pour s'adapter à la LaneGrid qui attend { TOP: [...], JUNGLE: [...] }, on le wrappe.
                // Note : Ton UI regroupe actuellement tous les vis-à-vis dans la colonne de la lane sélectionnée.
                setAnalyticsData({ [laneFilter]: response.data.data.matchups });
            } catch (error) {
                if (!axios.isCancel(error)) {
                    console.error("Erreur lors de la récupération des statistiques croisées :", error);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalytics();

        return () => abortController.abort();
    }, [puuid, laneFilter, activeSubView, timeFilter, recentCount, selectedChampion]);

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

    return (
        <div className="flex-1 glass-panel flex flex-col p-4 min-h-0">
            <SubViewSelector activeView={activeSubView} onViewChange={setActiveSubView} />
            <div className="flex-1 min-h-0 relative">
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
                />
            </div>
        </div>
    );
}