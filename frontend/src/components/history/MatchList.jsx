/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/MatchList.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Affiche la liste paginée des matchs.
 * Intègre la différenciation sémantique du bouton de bas de page et des
 * en-têtes collants (Sticky Headers).
 * 
 * MODIFICATIONS RECENTES :
 * - Correction du Glassmorphism (Seamless) : Remplacement des fonds sombres 
 * des séparateurs (Patch/Date) par une transparence totale couplée à un 
 * masque de dégradé (mask-image). Le flou s'estompe vers le bas, supprimant 
 * toute démarcation rectangulaire avec le fond de l'application.
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

    const [riotOffset, setRiotOffset] = useState(60);

    const limit = 10;
    const scrollRef = useRef(null);
    const loadingRef = useRef(null);

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

    useEffect(() => {
        if (!playerPuuid || isInitialLoading) return;

        const abortController = new AbortController();
        const currentLimit = Math.max(limit, matches.length);

        fetchMatches(null, currentLimit, abortController.signal);

        return () => {
            abortController.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playerPuuid, laneFilter, patchFilter, selectedChampion, refreshTrigger, isInitialLoading]);

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
                setRiotOffset(prev => prev + 60);

                if (res.data.new_matches_found === 0) {
                    setHasMoreRiot(false);
                } else {
                    await new Promise(resolve => setTimeout(resolve, 4000));
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

    useEffect(() => {
        if (!hasMoreLocal || isLoading || matches.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMoreMatches();
                }
            },
            {
                root: scrollRef.current,
                rootMargin: '200px',
                threshold: 0.1
            }
        );

        if (loadingRef.current) {
            observer.observe(loadingRef.current);
        }

        return () => {
            if (loadingRef.current) observer.unobserve(loadingRef.current);
            observer.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasMoreLocal, isLoading, matches]);

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
                <div className="absolute inset-0 z-50 bg-app/40 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl">
                    <div className="glass-panel w-[400px] p-8 flex flex-col items-center justify-center">
                        <div className="w-10 h-10 border-4 border-lol-gold border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-lol-gold font-bold tracking-widest uppercase text-sm drop-shadow-md">Synchronisation des données...</p>
                        <p className="text-gray-300 text-xs mt-2">L'observateur analyse votre profil</p>
                    </div>
                </div>
            )}

            {matches.length === 0 && !isLoading && !isInitialLoading && (
                <div className="glass-panel p-8 text-center text-lol-textMuted text-sm mt-4">
                    Aucune partie ne correspond aux critères de filtrage sélectionnés dans notre base de données.
                </div>
            )}

            {Object.keys(structuredData).map((patch) => (
                <div key={patch} className="flex flex-col">
                    {/* Divider Patch : Pilule flottante (.glass-pill) */}
                    <div className="sticky top-2 z-20 mb-4 flex justify-center pointer-events-none w-full">
                        <div className="glass-pill pointer-events-auto text-lol-gold">
                            PATCH {patch}
                        </div>
                    </div>

                    {Object.keys(structuredData[patch]).map((dateLabel) => (
                        <div key={dateLabel} className="flex flex-col">
                            {/* Divider Date : Pilule flottante décalée sous le Patch */}
                            <div className="sticky top-12 z-10 mb-4 flex justify-center pointer-events-none w-full">
                                <div className="glass-pill pointer-events-auto text-[10px] text-lol-textMuted">
                                    {dateLabel}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 mb-4">
                                {structuredData[patch][dateLabel].map((match, idx) => (
                                    <div
                                        key={match.info.gameId}
                                        className="animate-fade-in opacity-0"
                                        style={{ animationDelay: `${Math.min(idx * 50, 500)}ms` }}
                                    >
                                        <MatchCard
                                            match={match}
                                            matchList={matches}
                                            playerPuuid={playerPuuid}
                                            versionDDragon={versionDDragon}
                                            championMap={championMap}
                                            currentServer={currentServer}
                                            onPlayerSearch={onPlayerSearch}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ))}

            {hasMoreLocal && matches.length > 0 && (
                <div
                    ref={loadingRef}
                    className="w-full h-20 flex justify-center items-center shrink-0"
                    style={{ overflowAnchor: 'none' }}
                >
                    {isLoading && (
                        <div className="glass-pill py-2">
                            <div className="w-5 h-5 border-2 border-lol-gold border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>
            )}

            {!hasMoreLocal && hasMoreRiot && matches.length > 0 && (
                <button
                    onClick={loadMoreMatches}
                    disabled={isLoading}
                    className="my-4 glass-panel-interactive btn-glow text-lol-gold font-bold py-3 w-full text-center disabled:opacity-50 text-sm cursor-pointer"
                >
                    {isLoading
                        ? 'Exploration des archives...'
                        : 'Rechercher dans les archives Riot'
                    }
                </button>
            )}
        </div>
    );
};

export default MatchList;