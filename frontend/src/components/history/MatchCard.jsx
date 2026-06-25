/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/MatchCard.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Composant parent (Orchestrateur) pour l'affichage d'un match.
 * Gère la vue condensée (en-tête), l'état d'ouverture (isOpen), la navigation 
 * par onglets et intègre le système de Polling asynchrone pour l'ingestion 
 * de la Timeline à la volée.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import MatchCardSummary from './MatchCardSummary.jsx';
import MatchCardDivers from './MatchCardDivers.jsx';
import MatchCardRoleJungle from './MatchCardRoleJungle.jsx';

const SUMMONER_SPELLS = { 4: "SummonerFlash", 11: "SummonerSmite", 12: "SummonerTeleport", 14: "SummonerDot", 7: "SummonerHeal", 6: "SummonerHaste", 3: "SummonerExhaust", 21: "SummonerBarrier", 1: "SummonerBoost", 32: "SummonerSnowball" };
const RUNE_PATHS = { 8000: "7201_Precision", 8100: "7200_Domination", 8200: "7202_Sorcery", 8300: "7203_Whimsy", 8400: "7204_Resolve" };

const MatchCard = ({ match, playerPuuid, versionDDragon, championMap, currentServer, onPlayerSearch }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('resume');

    // Nouveaux états pour le système de Polling de la Timeline
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

    // Détection de la présence de la timeline dans toutes les couches de données possibles
    const hasTimeline = match.timeline || match.raw_timeline_data || match.raw_data?.timeline || fetchedTimeline;

    /**
     * Gère le cycle de vie du téléchargement asynchrone de la timeline.
     * Se déclenche uniquement lorsque l'utilisateur ouvre l'accordéon (isOpen)
     * et que la timeline est manquante. Effectue des appels API réguliers (Polling)
     * jusqu'à ce que le backend confirme l'ingestion de la donnée.
     */
    useEffect(() => {
        let intervalId;

        const checkTimelineStatus = async () => {
            try {
                const matchId = match.metadata?.matchId || match.match_id;
                // Appel vers le backend FastAPI (Triple appel ou simple vérification)
                const response = await fetch(`http://localhost:8000/api/v1/matches/${matchId}/timeline/status?puuid=${playerPuuid}&server=${currentServer}`);

                if (response.ok) {
                    const result = await response.json();

                    if (result.status === 'ready') {
                        // La donnée est prête en base, on l'injecte dans le composant
                        setFetchedTimeline(result.data);
                        setIsTimelineLoading(false);
                        clearInterval(intervalId);
                    } else if (result.status === 'loading') {
                        // Le Worker ARQ travaille toujours, on maintient l'animation
                        setIsTimelineLoading(true);
                    }
                }
            } catch (error) {
                console.error("Erreur de polling timeline:", error);
                clearInterval(intervalId);
                setIsTimelineLoading(false);
            }
        };

        if (isOpen && !hasTimeline) {
            setIsTimelineLoading(true);
            checkTimelineStatus(); // Premier appel immédiat
            intervalId = setInterval(checkTimelineStatus, 2000); // Boucle toutes les 2 secondes
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isOpen, hasTimeline, match, playerPuuid, currentServer]);

    const handleCardClick = () => {
        if (!isOpen) setActiveTab('resume');
        setIsOpen(!isOpen);
    };

    // Fusion de l'objet match initial avec la timeline fraîchement téléchargée
    const enrichedMatch = {
        ...match,
        timeline: fetchedTimeline || match.timeline || match.raw_timeline_data || match.raw_data?.timeline
    };

    return (
        <div className={`mb-3 rounded-sm border transition-all ${isWin ? 'bg-[#0f1e15] border-green-900/60' : 'bg-[#1e0f0f] border-red-900/60'}`}>

            {/* VUE CONDENSÉE */}
            <div onClick={handleCardClick} className="p-4 flex items-center w-full cursor-pointer select-none">
                <div className="flex items-center gap-3 w-[160px] shrink-0 min-w-0 pr-2">
                    <img src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/champion/${currentUserChampImage}.png`} alt={currentUserChampImage} className="w-12 h-12 rounded-sm border border-lol-border shrink-0" onError={(e) => e.target.src = 'https://ddragon.leagueoflegends.com/cdn/14.12.1/img/profileicon/29.png'} />
                    <div className="min-w-0 flex-1">
                        <div className="text-white font-bold text-sm truncate">{currentUserChampImage}</div>
                        {currentPlayer.teamPosition && <img src={`/assets/lanes/${currentPlayer.teamPosition.toLowerCase()}.png`} alt={currentPlayer.teamPosition} className="w-4 h-4 mt-1 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />}
                    </div>
                </div>

                <div className="flex gap-1 items-center w-[70px] shrink-0">
                    <div className="flex flex-col gap-0.5">
                        {[currentPlayer.summoner1Id, currentPlayer.summoner2Id].map((id, index) => (
                            <img key={index} src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/spell/${SUMMONER_SPELLS[id] || "SummonerFlash"}.png`} alt="Spell" className="w-5 h-5 rounded-sm border border-lol-border" />
                        ))}
                    </div>
                    <div className="flex flex-col gap-0.5 pl-1">
                        <div className="w-5 h-5 bg-lol-dark rounded-sm border border-lol-border flex items-center justify-center p-0.5">
                            <img src={`https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/${RUNE_PATHS[currentPlayer.perks?.primaryStyle] || "7200_Domination"}.png`} alt="Rune" className="w-full h-full object-contain" />
                        </div>
                        <div className="w-5 h-5 bg-lol-dark rounded-sm border border-lol-border flex items-center justify-center p-0.5">
                            <img src={`https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/${RUNE_PATHS[currentPlayer.perks?.subStyle] || "7201_Precision"}.png`} alt="Rune" className="w-full h-full object-contain opacity-70" />
                        </div>
                    </div>
                </div>

                <div className="text-center w-[90px] shrink-0">
                    <div className={`text-sm font-bold ${isWin ? 'text-green-400' : 'text-red-400'}`}>{isWin ? 'VICTOIRE' : 'DÉFAITE'}</div>
                    <div className="text-[#a0a0a0] text-xs font-semibold mt-1">{durationMin}:{durationSec < 10 ? `0${durationSec}` : durationSec}</div>
                </div>

                <div className="text-center w-[120px] shrink-0">
                    <div className="text-white font-bold text-sm">
                        {currentPlayer.kills} / <span className="text-red-400">{currentPlayer.deaths}</span> / {currentPlayer.assists}
                    </div>
                    <div className="text-[#a0a0a0] text-xs mt-1 font-medium">
                        {currentPlayer.deaths > 0 ? `${((currentPlayer.kills + currentPlayer.assists) / currentPlayer.deaths).toFixed(2)} KDA` : 'KDA Parfait'}
                    </div>
                </div>

                <div className="flex gap-1 justify-end flex-1 pl-4 min-w-0">
                    {[currentPlayer.item0, currentPlayer.item1, currentPlayer.item2, currentPlayer.item3, currentPlayer.item4, currentPlayer.item5, currentPlayer.item6].map((itemId, idx) => (
                        <div key={idx} className="w-7 h-7 bg-lol-dark rounded-sm border border-lol-border/40 overflow-hidden shrink-0">
                            {itemId > 0 && <img src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/item/${itemId}.png`} alt="Objet" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />}
                        </div>
                    ))}
                </div>
            </div>

            {/* ACCORDÉON DÉROULANT */}
            {isOpen && (
                <div className="border-t border-lol-border/20 bg-lol-dark/20 p-3">
                    <div className="flex gap-4 border-b border-lol-border/30 pb-2 mb-2 px-2">
                        <button onClick={() => setActiveTab('resume')} className={`text-xs font-bold uppercase tracking-wider transition-colors pb-1 ${activeTab === 'resume' ? 'text-lol-gold border-b-2 border-lol-gold' : 'text-gray-500 hover:text-gray-300'}`}>
                            Résumé
                        </button>
                        {currentPlayer.teamPosition === 'JUNGLE' && (
                            <button onClick={() => setActiveTab('role')} className={`text-xs font-bold uppercase tracking-wider transition-colors pb-1 ${activeTab === 'role' ? 'text-[#00ffff] border-b-2 border-[#00ffff]' : 'text-gray-500 hover:text-gray-300'}`}>
                                Analyse Jungle
                            </button>
                        )}
                        <button onClick={() => setActiveTab('divers')} className={`text-xs font-bold uppercase tracking-wider transition-colors pb-1 ${activeTab === 'divers' ? 'text-lol-gold border-b-2 border-lol-gold' : 'text-gray-500 hover:text-gray-300'}`}>
                            Divers
                        </button>
                    </div>

                    {activeTab === 'resume' && (
                        <MatchCardSummary team100={team100} team200={team200} playerPuuid={playerPuuid} versionDDragon={versionDDragon} championMap={championMap} currentServer={currentServer} onPlayerSearch={onPlayerSearch} />
                    )}

                    {activeTab === 'role' && currentPlayer.teamPosition === 'JUNGLE' && (
                        // Injection du prop isTimelineLoading dans le sous-composant
                        <MatchCardRoleJungle match={enrichedMatch} currentPlayer={currentPlayer} opponent={opponent} isTimelineLoading={isTimelineLoading} />
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