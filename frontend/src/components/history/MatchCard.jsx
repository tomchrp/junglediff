/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/MatchCard.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Composant parent (Orchestrateur) pour l'affichage détaillé d'un match.
 * Applique le Design System "Dark Data-Viz".
 * * MODIFICATIONS (Refacto Layered Architecture) :
 * - Suppression de l'intégration directe des composants de rôles (Jungle/Support).
 * - Intégration du `RoleAnalysisController` pour router dynamiquement les 
 * données d'analyse peu importe le rôle joué, purgeant ce composant 
 * de toute logique conditionnelle complexe.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import MatchCardSummary from './MatchCardSummary.jsx';
import MatchCardDivers from './MatchCardDivers.jsx';
// NOUVEL IMPORT UNIQUE POUR TOUS LES RÔLES
import RoleAnalysisController from './roles/RoleAnalysisController.jsx';

const SUMMONER_SPELLS = { 4: "SummonerFlash", 11: "SummonerSmite", 12: "SummonerTeleport", 14: "SummonerDot", 7: "SummonerHeal", 6: "SummonerHaste", 3: "SummonerExhaust", 21: "SummonerBarrier", 1: "SummonerBoost", 32: "SummonerSnowball" };
const RUNE_PATHS = { 8000: "7201_Precision", 8100: "7200_Domination", 8200: "7202_Sorcery", 8300: "7203_Whimsy", 8400: "7204_Resolve" };

/**
 * Composant principal affichant la carte d'un match.
 */
const MatchCard = ({ match, matchList = [], playerPuuid, versionDDragon, championMap, currentServer, onPlayerSearch }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('resume');

    const [isTimelineLoading, setIsTimelineLoading] = useState(false);
    const [fetchedTimeline, setFetchedTimeline] = useState(null);

    const info = match.info;
    const currentPlayer = info.participants.find(p => p.puuid === playerPuuid);

    if (!currentPlayer) return null;

    const opponent = info.participants.find(p =>
        p.teamPosition === currentPlayer.teamPosition &&
        p.teamId !== currentPlayer.teamId &&
        p.teamPosition !== "NONE" && p.teamPosition !== ""
    );

    const isWin = currentPlayer.win;
    const durationMin = Math.floor(info.gameDuration / 60);
    const durationSec = info.gameDuration % 60;

    const team100 = info.participants.filter(p => p.teamId === 100);
    const team200 = info.participants.filter(p => p.teamId === 200);

    const getChampionImageName = (champId) => championMap[champId] || "Inconnu";
    const currentUserChampImage = getChampionImageName(currentPlayer.championId);

    const hasTimeline = match.timeline || match.raw_timeline_data || match.raw_data?.timeline || fetchedTimeline;

    /**
     * Gère le cycle de vie réseau lié à la timeline du match.
     * Implémente un délai de grâce et l'anticipation spatiale.
     */
    useEffect(() => {
        let pollingTimeoutId;
        let graceTimeoutId;
        let anticipationTimeoutId;
        let currentDelay = 2000;

        const checkTimelineStatus = async () => {
            if (!isOpen) return;

            try {
                const matchId = match.metadata?.matchId || match.match_id;
                const response = await fetch(`http://localhost:8000/api/v1/matches/${matchId}/timeline/status?puuid=${playerPuuid}&server=${currentServer}`);

                if (response.ok) {
                    const result = await response.json();

                    if (result.status === 'ready') {
                        setFetchedTimeline(result.data);
                        setIsTimelineLoading(false);
                        return;
                    } else if (result.status === 'loading') {
                        currentDelay = Math.min(currentDelay * 1.5, 8000);
                        pollingTimeoutId = setTimeout(checkTimelineStatus, currentDelay);
                    }
                } else {
                    currentDelay = Math.min(currentDelay * 1.5, 8000);
                    pollingTimeoutId = setTimeout(checkTimelineStatus, currentDelay);
                }
            } catch (error) {
                console.error("Erreur de polling timeline:", error);
                currentDelay = Math.min(currentDelay * 1.5, 8000);
                pollingTimeoutId = setTimeout(checkTimelineStatus, currentDelay);
            }
        };

        const triggerAnticipation = async () => {
            if (!isOpen) return;

            try {
                const matchId = match.metadata?.matchId || match.match_id;
                let prefetchIds = [];

                if (matchList && matchList.length > 0) {
                    const currentIndex = matchList.findIndex(m => (m.metadata?.matchId || m.match_id) === matchId);
                    if (currentIndex > 0) {
                        const prevMatch = matchList[currentIndex - 1];
                        prefetchIds.push(prevMatch.metadata?.matchId || prevMatch.match_id);
                    }
                    if (currentIndex < matchList.length - 1) {
                        const nextMatch = matchList[currentIndex + 1];
                        prefetchIds.push(nextMatch.metadata?.matchId || nextMatch.match_id);
                    }
                }

                if (prefetchIds.length > 0) {
                    fetch(`http://localhost:8000/api/v1/matches/${matchId}/timeline/status?puuid=${playerPuuid}&server=${currentServer}&prefetch_ids=${prefetchIds.join(',')}`).catch(() => { });
                }
            } catch (e) {
                // Ignoré silencieusement pour ne pas polluer la console
            }
        };

        if (isOpen && !hasTimeline) {
            setIsTimelineLoading(true);
            graceTimeoutId = setTimeout(() => { checkTimelineStatus(); }, 400);
            anticipationTimeoutId = setTimeout(() => { triggerAnticipation(); }, 1500);
        } else if (!isOpen) {
            if (!hasTimeline) setIsTimelineLoading(false);
        }

        return () => {
            if (graceTimeoutId) clearTimeout(graceTimeoutId);
            if (anticipationTimeoutId) clearTimeout(anticipationTimeoutId);
            if (pollingTimeoutId) clearTimeout(pollingTimeoutId);
        };
    }, [isOpen, hasTimeline, match, matchList, playerPuuid, currentServer]);

    const handleCardClick = () => {
        if (!isOpen) setActiveTab('resume');
        setIsOpen(!isOpen);
    };

    const accentClass = isWin ? 'border-l-lol-win' : 'border-l-lol-loss';

    return (
        <div className={`mb-3 glass-panel-interactive border-l-4 overflow-hidden ${accentClass}`}>
            <div onClick={handleCardClick} className="p-4 flex items-center w-full select-none cursor-pointer">
                {/* Section Avatar & Champion */}
                <div className="flex items-center gap-3 w-[160px] shrink-0 min-w-0 pr-2">
                    <img
                        src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/champion/${currentUserChampImage}.png`}
                        alt={currentUserChampImage}
                        className="w-12 h-12 rounded-md border border-border-strong shrink-0"
                        onError={(e) => e.target.src = 'https://ddragon.leagueoflegends.com/cdn/14.12.1/img/profileicon/29.png'}
                    />
                    <div className="min-w-0 flex-1">
                        <div className="text-gray-100 font-bold text-sm truncate">{currentUserChampImage}</div>
                        {currentPlayer.teamPosition && (
                            <img
                                src={`/assets/lanes/${currentPlayer.teamPosition.toLowerCase()}.png`}
                                alt={currentPlayer.teamPosition}
                                className="w-4 h-4 mt-1 object-contain"
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        )}
                    </div>
                </div>

                {/* Section Runes & Sorts */}
                <div className="flex gap-1 items-center w-[70px] shrink-0">
                    <div className="flex flex-col gap-0.5">
                        {[currentPlayer.summoner1Id, currentPlayer.summoner2Id].map((id, index) => (
                            <img key={index} src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/spell/${SUMMONER_SPELLS[id] || "SummonerFlash"}.png`} alt="Sort" className="w-5 h-5 rounded-md border border-border-glass" />
                        ))}
                    </div>
                    <div className="flex flex-col gap-0.5 pl-1">
                        <div className="w-5 h-5 bg-surface-solid rounded-md border border-border-glass flex items-center justify-center p-0.5">
                            <img src={`https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/${RUNE_PATHS[currentPlayer.perks?.primaryStyle] || "7200_Domination"}.png`} alt="Rune" className="w-full h-full object-contain" />
                        </div>
                        <div className="w-5 h-5 bg-surface-solid rounded-md border border-border-glass flex items-center justify-center p-0.5">
                            <img src={`https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/${RUNE_PATHS[currentPlayer.perks?.subStyle] || "7201_Precision"}.png`} alt="Rune" className="w-full h-full object-contain opacity-70" />
                        </div>
                    </div>
                </div>

                {/* Section Issue du Match & Durée */}
                <div className="text-center w-[90px] shrink-0">
                    <div className={`text-sm font-bold ${isWin ? 'text-lol-win' : 'text-lol-loss'}`}>
                        {isWin ? 'VICTOIRE' : 'DÉFAITE'}
                    </div>
                    <div className="text-lol-textMuted text-xs font-semibold mt-1">
                        {durationMin}:{durationSec < 10 ? `0${durationSec}` : durationSec}
                    </div>
                </div>

                {/* Section KDA */}
                <div className="text-center w-[120px] shrink-0">
                    <div className="text-gray-100 font-bold text-sm">
                        {currentPlayer.kills} / <span className="text-lol-loss">{currentPlayer.deaths}</span> / {currentPlayer.assists}
                    </div>
                    <div className="text-lol-textMuted text-xs mt-1 font-medium">
                        {currentPlayer.deaths > 0 ? `${((currentPlayer.kills + currentPlayer.assists) / currentPlayer.deaths).toFixed(2)} KDA` : 'KDA Parfait'}
                    </div>
                </div>

                {/* Section Équipement */}
                <div className="flex gap-1 justify-end flex-1 pl-4 min-w-0">
                    {[currentPlayer.item0, currentPlayer.item1, currentPlayer.item2, currentPlayer.item3, currentPlayer.item4, currentPlayer.item5, currentPlayer.item6].map((itemId, idx) => (
                        <div key={idx} className="w-7 h-7 bg-surface-solid rounded-md border border-border-glass overflow-hidden shrink-0">
                            {itemId > 0 && <img src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/item/${itemId}.png`} alt="Objet" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />}
                        </div>
                    ))}
                </div>
            </div>

            {/* ACCORDÉON DÉROULANT */}
            {isOpen && (
                <div className="border-t border-border-glass bg-app/50 p-3">
                    <div className="flex gap-4 border-b border-border-strong pb-2 mb-2 px-2">
                        <button onClick={() => setActiveTab('resume')} className={`text-xs font-bold uppercase tracking-wider transition-colors pb-1 ${activeTab === 'resume' ? 'text-lol-gold border-b-2 border-lol-gold' : 'text-lol-textMuted hover:text-gray-200'}`}>
                            Résumé
                        </button>

                        {(currentPlayer.teamPosition === 'JUNGLE' || currentPlayer.teamPosition === 'UTILITY') && (
                            <button onClick={() => setActiveTab('role_analysis')} className={`text-xs font-bold uppercase tracking-wider transition-colors pb-1 ${activeTab === 'role_analysis' ? 'text-lol-info border-b-2 border-lol-info' : 'text-lol-textMuted hover:text-gray-200'}`}>
                                Analyse {currentPlayer.teamPosition}
                            </button>
                        )}

                        <button onClick={() => setActiveTab('divers')} className={`text-xs font-bold uppercase tracking-wider transition-colors pb-1 ${activeTab === 'divers' ? 'text-lol-gold border-b-2 border-lol-gold' : 'text-lol-textMuted hover:text-gray-200'}`}>
                            Divers
                        </button>
                    </div>

                    {activeTab === 'resume' && (
                        <MatchCardSummary team100={team100} team200={team200} playerPuuid={playerPuuid} versionDDragon={versionDDragon} championMap={championMap} currentServer={currentServer} onPlayerSearch={onPlayerSearch} />
                    )}

                    {/* APPEL UNIQUE AU CONTRÔLEUR DYNAMIQUE */}
                    {activeTab === 'role_analysis' && (
                        <RoleAnalysisController
                            matchId={match.metadata?.matchId || match.match_id}
                            puuid={playerPuuid}
                            role={currentPlayer.teamPosition}
                            isTimelineLoading={isTimelineLoading}
                            versionDDragon={versionDDragon} // <-- AJOUT ICI
                        />
                    )}

                    {activeTab === 'divers' && (
                        <MatchCardDivers
                            currentPlayer={currentPlayer}
                            opponent={opponent}
                            versionDDragon={versionDDragon}
                            championName={currentUserChampImage}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default MatchCard;