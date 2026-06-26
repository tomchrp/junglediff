/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/MatchList.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Affiche la liste paginée des matchs.
 * Intègre la différenciation sémantique du bouton de bas de page.
 * ANTI-DÉCALAGE : Calcule une limite dynamique lors des rafraîchissements 
 * en arrière-plan pour maintenir le volume de cartes affichées et empêcher 
 * la perte de la position de lecture (Scroll Anchoring).
 * ============================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import MatchCard from './MatchCard.jsx';

const MatchList = ({
    playerPuuid, laneFilter, patchFilter, selectedChampion,
    versionDDragon, championMap, currentServer, onPlayerSearch,
    isInitialLoading, refreshTrigger
}) => {
    const [matches, setMatches] = useState([]);
    const [endTime, setEndTime] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const [hasMoreLocal, setHasMoreLocal] = useState(true);
    const [hasMoreRiot, setHasMoreRiot] = useState(true);

    const [riotOffset, setRiotOffset] = useState(20);

    const limit = 10;
    const scrollRef = useRef(null);

    /**
     * Exécute la requête HTTP. 
     * Accepte désormais un paramètre overrideLimit pour préserver le volume
     * de l'historique lors d'un rafraîchissement silencieux.
     */
    const fetchMatches = async (currentEndTime = endTime, overrideLimit = limit, signal = null) => {
        if (!playerPuuid) return [];

        if (!currentEndTime && matches.length === 0) setIsLoading(true);

        try {
            let url = `http://localhost:8000/api/v1/matches/${playerPuuid}/history?limit=${overrideLimit}`;
            if (currentEndTime) url += `&end_time=${currentEndTime}`;
            if (laneFilter !== 'ALL') url += `&lane=${laneFilter}`;
            if (selectedChampion) url += `&champion_id=${selectedChampion}`;
            if (patchFilter !== 'ALL') url += `&patch=${patchFilter}`;

            const res = await axios.get(url, { signal });
            const newMatches = res.data.matches;
            const moreInDb = res.data.has_more_in_db;

            setMatches(prev => !currentEndTime ? newMatches : [...prev, ...newMatches]);
            setHasMoreLocal(moreInDb);
            return newMatches;
        } catch (error) {
            if (!axios.isCancel(error)) console.error("Erreur historique locale:", error);
            return [];
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 1. Réinitialisation explicite (SANS refreshTrigger).
     */
    useEffect(() => {
        setMatches([]);
        setEndTime(null);
        setHasMoreLocal(true);
        setHasMoreRiot(true);
        setRiotOffset(20);
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [playerPuuid, laneFilter, patchFilter, selectedChampion]);

    /**
     * 2. Déclenchement de la requête (Rafraîchissement & Filtres).
     */
    useEffect(() => {
        if (!playerPuuid || isInitialLoading) return;

        const abortController = new AbortController();

        // FIX : Calcul de la limite dynamique
        // Si l'utilisateur a déjà chargé 30 parties, on rafraîchit 30 parties
        // pour empêcher l'interface de s'effondrer brutalement vers le haut.
        const currentLimit = Math.max(limit, matches.length);

        fetchMatches(null, currentLimit, abortController.signal);

        return () => {
            abortController.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playerPuuid, laneFilter, patchFilter, selectedChampion, refreshTrigger, isInitialLoading]);

    /**
     * Routage sémantique du bouton de chargement.
     */
    const loadMoreMatches = async () => {
        if (matches.length === 0 || isLoading) return;

        if (hasMoreLocal) {
            const lastMatch = matches[matches.length - 1];
            const nextEndTime = lastMatch.info.gameCreation;
            setEndTime(nextEndTime);
            setIsLoading(true);
            await fetchMatches(nextEndTime, limit);
        } else {
            setIsLoading(true);
            try {
                const res = await axios.post(`http://localhost:8000/api/v1/matches/${playerPuuid}/fetch-older?server=${currentServer}&current_total=${riotOffset}`);
                setRiotOffset(prev => prev + 20);

                if (res.data.new_matches_found === 0) {
                    setHasMoreRiot(false);
                } else {
                    await new Promise(resolve => setTimeout(resolve, 4000));

                    // On utilise le dernier match de l'état local actuel comme ancre
                    const lastMatch = matches[matches.length - 1];
                    const nextEndTime = lastMatch.info.gameCreation;
                    setEndTime(nextEndTime);
                    await fetchMatches(nextEndTime, limit);
                }
            } catch (error) {
                console.error("Erreur Deep Fetch:", error);
                setHasMoreRiot(false);
            } finally {
                setIsLoading(false);
            }
        }
    };

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

    return (
        <div ref={scrollRef} className="flex flex-col w-full flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 relative">

            {isInitialLoading && (
                <div className="absolute inset-0 z-10 bg-lol-bg/80 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="animate-pulse flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-lol-gold border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-lol-gold font-bold tracking-widest uppercase text-sm">Ingestion des parties en cours...</p>
                        <p className="text-gray-400 text-xs mt-2">Le worker ARQ synchronise votre profil</p>
                    </div>
                </div>
            )}

            {matches.length === 0 && !isLoading && !isInitialLoading && (
                <div className="bg-lol-blue border border-lol-border rounded p-8 text-center text-gray-400 text-sm mt-4">
                    Aucune partie ne correspond aux critères de filtrage sélectionnés dans notre base de données.
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
                                    matchList={matches}
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

            {(hasMoreLocal || hasMoreRiot) && matches.length > 0 && (
                <button
                    onClick={loadMoreMatches}
                    disabled={isLoading}
                    className="my-4 bg-lol-blue border border-lol-border text-lol-gold font-bold py-2.5 rounded hover:bg-lol-dark transition-colors disabled:opacity-50 text-sm cursor-pointer"
                >
                    {isLoading
                        ? 'Interrogation des bases de données...'
                        : hasMoreLocal
                            ? 'Afficher les parties suivantes'
                            : 'Rechercher dans les archives Riot'
                    }
                </button>
            )}
        </div>
    );
};

export default MatchList;