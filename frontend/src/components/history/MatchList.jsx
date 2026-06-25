import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import MatchCard from './MatchCard.jsx';

const MatchList = ({ playerPuuid, laneFilter, patchFilter, selectedChampion, versionDDragon, championMap, currentServer, onPlayerSearch }) => {
    const [matches, setMatches] = useState([]);

    // Remplacement de l'offset par le temps
    const [endTime, setEndTime] = useState(null);

    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const limit = 10;

    const scrollRef = useRef(null);

    // Réinitialisation totale quand on change de filtre ou de joueur
    useEffect(() => {
        setMatches([]);
        setEndTime(null);
        setHasMore(true);
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [playerPuuid, laneFilter, patchFilter, selectedChampion]);

    // Déclencheur de requête API
    useEffect(() => {
        if (!playerPuuid) return;
        const fetchMatches = async () => {
            setIsLoading(true);
            try {
                let url = `http://localhost:8000/api/v1/matches/${playerPuuid}/history?limit=${limit}&`;
                if (endTime) url += `end_time=${endTime}&`;
                if (laneFilter !== 'ALL') url += `lane=${laneFilter}&`;
                if (selectedChampion) url += `champion_id=${selectedChampion}`;

                const res = await axios.get(url);
                const newMatches = res.data.matches;

                // Filtrage post-requête pour le patch
                const filteredByPatch = patchFilter !== 'ALL' ? newMatches.filter(m => m.info.gameVersion.startsWith(patchFilter)) : newMatches;

                // Si endTime est null, c'est une nouvelle recherche. Sinon, on ajoute à la suite.
                setMatches(prev => !endTime ? filteredByPatch : [...prev, ...filteredByPatch]);

                // S'il reste moins de matchs que la limite demandée, on a touché le fond de la base
                if (newMatches.length < limit) setHasMore(false);
            } catch (error) {
                console.error("Erreur historique:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMatches();
    }, [playerPuuid, endTime, laneFilter, patchFilter, selectedChampion]);

    const formatDateLabel = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const getStructuredHistory = () => {
        const patchGroups = {};
        matches.forEach(match => {
            const fullVersion = match.info.gameVersion || "0.00";
            const shortPatch = fullVersion.split('.').slice(0, 2).join('.');
            const dayLabel = formatDateLabel(match.info.gameCreation);
            if (!patchGroups[shortPatch]) patchGroups[shortPatch] = {};
            if (!patchGroups[shortPatch][dayLabel]) patchGroups[shortPatch][dayLabel] = [];
            patchGroups[shortPatch][dayLabel].push(match);
        });
        return patchGroups;
    };

    const structuredData = getStructuredHistory();

    const loadMoreMatches = () => {
        if (matches.length > 0) {
            // On prend la date de création exacte de la TOUTE DERNIÈRE partie affichée
            const lastMatch = matches[matches.length - 1];
            setEndTime(lastMatch.info.gameCreation);
        }
    };

    return (
        <div ref={scrollRef} className="flex flex-col w-full flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
            {matches.length === 0 && !isLoading && (
                <div className="bg-lol-blue border border-lol-border rounded p-8 text-center text-gray-400 text-sm">
                    Aucune partie ne correspond aux critères de filtrage sélectionnés.
                </div>
            )}

            {Object.keys(structuredData).map((patch) => (
                <div key={patch} className="mb-6">
                    <div className="flex items-center my-4">
                        <div className="flex-1 border-t border-lol-border"></div>
                        <span className="px-4 text-lol-gold text-xs font-bold tracking-widest uppercase bg-lol-dark">
                            PATCH {patch}
                        </span>
                        <div className="flex-1 border-t border-lol-border"></div>
                    </div>

                    {Object.keys(structuredData[patch]).map((dateLabel) => (
                        <div key={dateLabel} className="mb-4">
                            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 pl-1">
                                {dateLabel}
                            </div>
                            {structuredData[patch][dateLabel].map(match => (
                                <MatchCard
                                    key={match.info.gameId}
                                    match={match}
                                    playerPuuid={playerPuuid}
                                    versionDDragon={versionDDragon}
                                    championMap={championMap}
                                    currentServer={currentServer}
                                    onPlayerSearch={onPlayerSearch}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            ))}

            {hasMore && matches.length > 0 && (
                <button
                    onClick={loadMoreMatches}
                    disabled={isLoading}
                    className="my-4 bg-lol-blue border border-lol-border text-lol-gold font-bold py-2.5 rounded hover:bg-lol-dark transition-colors disabled:opacity-50 text-sm cursor-pointer"
                >
                    {isLoading ? 'Chargement en cours...' : 'Charger plus de parties'}
                </button>
            )}
        </div>
    );
};

export default MatchList;