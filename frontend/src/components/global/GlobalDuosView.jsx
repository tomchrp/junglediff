/**
 * ============================================================================
 * FICHIER : frontend/src/components/global/GlobalDuosView.jsx
 * ============================================================================
 * MODIFICATIONS (Phase 3) :
 * - Remplacement de la structure Flexbox manuelle par SplitDataViewLayout.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DuoList from './DuoList.jsx';
import DuoBottomConsole from './DuoBottomConsole.jsx';
import SplitDataViewLayout from '../layouts/SplitDataViewLayout.jsx';

const GlobalDuosView = ({ primaryLane, secondaryLane, versionDDragon, championMap }) => {
    const [duosList, setDuosList] = useState([]);
    const [selectedDuo, setSelectedDuo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        const fetchDuos = async () => {
            if (duosList.length === 0) setIsLoading(true);
            setError(null);

            try {
                const response = await axios.get('http://localhost:8000/api/v1/global-duos/', {
                    params: { primary_lane: primaryLane, secondary_lane: secondaryLane },
                    signal: controller.signal
                });

                const uniqueDuos = [];
                const seen = new Set();

                for (const duo of response.data) {
                    const key = [duo.champ_a, duo.champ_b].sort().join('-');
                    if (!seen.has(key)) {
                        seen.add(key);
                        uniqueDuos.push(duo);
                    }
                }

                const sortedData = uniqueDuos.sort((a, b) => b.duo_wr - a.duo_wr);
                setDuosList(sortedData);

                if (selectedDuo) {
                    const stillExists = sortedData.some(
                        d => (d.champ_a === selectedDuo.champ_a && d.champ_b === selectedDuo.champ_b) ||
                            (d.champ_a === selectedDuo.champ_b && d.champ_b === selectedDuo.champ_a)
                    );
                    if (!stillExists) setSelectedDuo(null);
                }
            } catch (err) {
                if (!axios.isCancel(err)) {
                    console.error('Erreur réseau:', err);
                    setError("Impossible de charger les données de la Meta.");
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchDuos();
        return () => controller.abort();
    }, [primaryLane, secondaryLane]);

    const masterContent = (
        <>
            <div className="shrink-0 flex items-center justify-between border-b border-border-glass px-4 py-3">
                <h2 className="text-lol-gold font-bold uppercase tracking-widest text-sm">
                    Classement des synergies
                </h2>
                <span className="text-xs text-lol-textMuted">{duosList.length} combinaisons uniques</span>
            </div>

            {isLoading && duosList.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <span className="animate-pulse text-lol-gold font-bold uppercase tracking-widest text-sm">
                        Extraction depuis le Data Lake...
                    </span>
                </div>
            ) : error ? (
                <div className="p-6 text-lol-loss text-sm">{error}</div>
            ) : (
                <DuoList
                    data={duosList}
                    activeDuo={selectedDuo}
                    onSelect={setSelectedDuo}
                    versionDDragon={versionDDragon}
                    championMap={championMap}
                    primaryLane={primaryLane}
                />
            )}
        </>
    );

    const detailContent = selectedDuo ? (
        <DuoBottomConsole
            duo={selectedDuo}
            onClose={() => setSelectedDuo(null)}
            versionDDragon={versionDDragon}
            championMap={championMap}
            primaryLane={primaryLane}
        />
    ) : null;

    return (
        <SplitDataViewLayout
            masterContent={masterContent}
            masterContainerClassName="glass-panel"
            detailContent={detailContent}
            isDetailOpen={!!selectedDuo}
            detailContainerClassName="glass-panel p-4"
        />
    );
};

export default GlobalDuosView;