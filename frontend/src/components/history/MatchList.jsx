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
 * ANTI-DÉCALAGE : Calcule une limite dynamique lors des rafraîchissements 
 * en arrière-plan pour maintenir le volume de cartes affichées et empêcher 
 * la perte de la position de lecture (Scroll Anchoring).
 * 
 * CHANGEMENTS "DARK DATA-VIZ" :
 * - Remplacement de l'overlay de chargement (bg-lol-bg/80) par bg-app/80.
 * - L'état vide (Empty State) devient un .glass-panel propre sans bordures bleues.
 * - Les séparateurs collants utilisent bg-app (Patch) et bg-surface-solid/95 (Date) 
 *   pour une intégration parfaite au défilement.
 * - Le bouton de chargement passe sur la primitive glass-panel-interactive.
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
     * Exécute la requête HTTP pour récupérer l'historique paginé depuis l'API locale.
     * Construit dynamiquement l'URL en appliquant les filtres actifs (rôle, patch, champion) 
     * et gère le curseur de pagination (endTime) pour accumuler les matchs sans perte.
     * 
     * @param {number|null} currentEndTime - Timestamp du dernier match chargé.
     * @param {number} overrideLimit - Nombre de matchs à requérir (ajustable pour le Scroll Anchoring).
     * @param {AbortSignal|null} signal - Signal pour annuler la requête en cas de démontage.
     * @returns {Array} Liste des nouveaux matchs récupérés.
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
     * Interroge d'abord la base de données locale. Si les données locales sont épuisées,
     * déclenche un deep-fetch asynchrone vers les serveurs de Riot Games pour 
     * étendre l'historique du joueur, puis relance une requête locale.
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

    /**
     * Transforme la liste plate des matchs en une structure arborescente imbriquée.
     * Les données sont d'abord groupées par version majeure de patch, puis 
     * subdivisées par journée calendaire pour permettre l'affichage des 
     * en-têtes collants contextuels.
     * 
     * @returns {Object} Dictionnaire structuré { "14.12": { "lundi 10 juin": [...] } }
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
                    {/* Séparateur de Patch : Hauteur stricte (h-10) et suppression du margin-bottom */}
                    <div className="sticky top-0 z-20 h-10 bg-app/90 backdrop-blur-md flex items-center">
                        <div className="flex-1 border-t border-border-strong"></div>
                        <span className="px-4 text-lol-gold text-xs font-bold tracking-widest uppercase">
                            PATCH {patch}
                        </span>
                        <div className="flex-1 border-t border-border-strong"></div>
                    </div>

                    {Object.keys(structuredData[patch]).map((dateLabel) => (
                        <div key={dateLabel}>
                            {/* Séparateur de Date : S'emboîte exactement sous le patch (top-10 = 40px) */}
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

            {(hasMoreLocal || hasMoreRiot) && matches.length > 0 && (
                <button
                    onClick={loadMoreMatches}
                    disabled={isLoading}
                    className="my-4 glass-panel-interactive text-lol-gold font-bold py-2.5 w-full text-center disabled:opacity-50 text-sm cursor-pointer"
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