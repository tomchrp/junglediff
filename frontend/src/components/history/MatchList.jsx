/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/MatchList.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Affiche la liste paginée des matchs.
 * Intègre la différenciation sémantique du bouton de bas de page et des
 * en-têtes collants (Sticky Headers) pour maintenir le contexte temporel 
 * et de version lors du défilement.
 * * MODIFICATIONS RECENTES :
 * - Implémentation de l'Infinite Scroll (Intersection Observer) : le chargement 
 * des parties locales se déclenche désormais automatiquement au défilement.
 * - Le bouton manuel est conservé EXCLUSIVEMENT comme garde-fou pour 
 * le deep-fetch (Recherche dans les archives de l'API Riot).
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
    const loadingRef = useRef(null); // Référence pour l'Infinite Scroll

    /**
     * Exécute la requête HTTP pour récupérer l'historique paginé depuis l'API locale.
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
     * 1. Réinitialisation explicite lors d'un changement de filtre (SANS refreshTrigger).
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
     * 2. Déclenchement de la requête initiale ou suite à un rafraîchissement (Background ARQ).
     */
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

    /**
     * Gère la logique de pagination intelligente à deux niveaux.
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

    /**
     * 3. INFINITE SCROLL : Observer pour le chargement automatique.
     * Se déclenche uniquement s'il reste des parties locales (hasMoreLocal).
     */
    useEffect(() => {
        // On ne met pas en place l'observer s'il n'y a plus de données locales ou si on charge déjà
        if (!hasMoreLocal || isLoading || matches.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMoreMatches();
                }
            },
            {
                root: scrollRef.current,
                rootMargin: '200px', // Déclenche le chargement 200px avant d'atteindre le fond
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

    /**
     * Transforme la liste plate des matchs en une structure arborescente imbriquée.
     */
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
                <div className="absolute inset-0 z-50 bg-app/80 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="animate-pulse flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-lol-gold border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-lol-gold font-bold tracking-widest uppercase text-sm">Ingestion des parties en cours...</p>
                        <p className="text-lol-textMuted text-xs mt-2">Le worker ARQ synchronise votre profil</p>
                    </div>
                </div>
            )}

            {matches.length === 0 && !isLoading && !isInitialLoading && (
                <div className="glass-panel p-8 text-center text-lol-textMuted text-sm mt-4">
                    Aucune partie ne correspond aux critères de filtrage sélectionnés dans notre base de données.
                </div>
            )}

            {Object.keys(structuredData).map((patch) => (
                <div key={patch}>
                    <div className="sticky top-0 z-20 h-10 bg-app/90 backdrop-blur-md flex items-center">
                        <div className="flex-1 border-t border-border-strong"></div>
                        <span className="px-4 text-lol-gold text-xs font-bold tracking-widest uppercase">
                            PATCH {patch}
                        </span>
                        <div className="flex-1 border-t border-border-strong"></div>
                    </div>

                    {Object.keys(structuredData[patch]).map((dateLabel) => (
                        <div key={dateLabel}>
                            <div className="sticky top-10 z-10 bg-app/90 backdrop-blur-md py-2 mb-3 flex items-center">
                                <span className="text-lol-textMuted text-xs font-bold uppercase tracking-wider pr-4">
                                    {dateLabel}
                                </span>
                                <div className="flex-1 border-t border-border-glass"></div>
                            </div>

                            <div className="mb-4">
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
                        </div>
                    ))}
                </div>
            ))}

            {/* SENTINELLE POUR L'AUTOLOAD (Infinite Scroll Local) */}
            {hasMoreLocal && matches.length > 0 && (
                <div
                    ref={loadingRef}
                    // Remplacement de "py-6" par "h-20" (hauteur fixe de 80px garantie)
                    className="w-full h-20 flex justify-center items-center shrink-0"
                    // Désactivation de l'ancrage natif du navigateur pour cette zone précise
                    style={{ overflowAnchor: 'none' }}
                >
                    {isLoading && (
                        <div className="w-8 h-8 border-4 border-lol-gold border-t-transparent rounded-full animate-spin"></div>
                    )}
                </div>
            )}

            {/* BOUTON MANUEL POUR LE DEEP FETCH (Archives Riot) */}
            {!hasMoreLocal && hasMoreRiot && matches.length > 0 && (
                <button
                    onClick={loadMoreMatches}
                    disabled={isLoading}
                    className="my-4 glass-panel-interactive text-lol-gold font-bold py-2.5 w-full text-center disabled:opacity-50 text-sm cursor-pointer"
                >
                    {isLoading
                        ? 'Recherche dans les archives en cours...'
                        : 'Rechercher dans les archives Riot'
                    }
                </button>
            )}
        </div>
    );
};

export default MatchList;