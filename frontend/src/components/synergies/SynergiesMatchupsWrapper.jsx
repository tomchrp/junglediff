/**
 * ============================================================================
 * FICHIER : frontend/src/components/synergies/SynergiesMatchupsWrapper.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Conteneur intelligent de la vue analytique avancée.
 * Réalise des appels HTTP vers le backend pour récupérer les statistiques 
 * croisées (Auto-jointure SQL). Écoute les paramètres transversaux (Lane, 
 * Patch) ainsi que la sélection d'un champion spécifique dans la SideBar.
 * Intègre un AbortController pour garantir l'intégrité des requêtes asynchrones.
 * * DESIGN SYSTEM : Adoption du glass-panel et du loader backdrop-blur.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SubViewSelector from './SubViewSelector.jsx';
import LaneGrid from './LaneGrid.jsx';

export default function SynergiesMatchupsWrapper({ puuid, laneFilter, patchFilter, versionDDragon, championMap, selectedChampion }) {
    const [activeSubView, setActiveSubView] = useState('SYNERGIES');
    const [isLoading, setIsLoading] = useState(false);
    const [analyticsData, setAnalyticsData] = useState({ TOP: [], JUNGLE: [], MIDDLE: [], BOTTOM: [], UTILITY: [] });

    useEffect(() => {
        // Annulation silencieuse si le contexte global n'est pas défini
        if (laneFilter === 'ALL') return;

        const abortController = new AbortController();

        const fetchAnalytics = async () => {
            setIsLoading(true);
            try {
                let url = `http://localhost:8000/api/v1/players/${puuid}/analytics?lane=${laneFilter}&type=${activeSubView}&patch=${patchFilter}`;

                // Injection dynamique du filtre de champion s'il est sélectionné dans la SideBar
                if (selectedChampion) {
                    url += `&champion_id=${selectedChampion}`;
                }

                const response = await axios.get(url, { signal: abortController.signal });
                setAnalyticsData(response.data);
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
    }, [puuid, laneFilter, patchFilter, activeSubView, selectedChampion]);

    // Règle métier : Blocage si la position n'est pas définie
    if (laneFilter === 'ALL') {
        return (
            <div className="flex-1 glass-panel flex flex-col items-center justify-center p-8">
                <div className="text-center bg-surface-solid p-6 rounded-md border border-border-strong max-w-md shadow-glass">
                    <h2 className="text-xl font-bold text-lol-gold mb-2 uppercase tracking-widest">Action Requise</h2>
                    <p className="text-gray-100 text-sm">
                        L'analyse des synergies et matchups nécessite un contexte strict.
                    </p>
                    <p className="text-lol-textMuted text-xs mt-4">
                        Veuillez sélectionner une position (Top, Jungle, Mid, ADC ou Support) dans la barre de filtres ci-dessus.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 glass-panel flex flex-col p-4 min-h-0">
            <SubViewSelector
                activeView={activeSubView}
                onViewChange={setActiveSubView}
            />

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-app/80 backdrop-blur-sm z-10 rounded-md">
                        <span className="text-lol-gold font-bold tracking-widest uppercase animate-pulse">Calcul des statistiques croisées...</span>
                    </div>
                ) : null}

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