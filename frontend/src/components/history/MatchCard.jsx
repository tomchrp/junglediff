/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/MatchCard.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Composant parent (Orchestrateur) pour l'affichage détaillé d'un match.
 * 
 * MODIFICATIONS RECENTES :
 * - Remplacement de toutes les balises <img> brutes par la primitive <Avatar>.
 * - Harmonisation totale des bordures, tailles et fonds (system design).
 * - Correction de l'ergonomie : le survol (hover) ne s'applique qu'à l'en-tête cliquable.
 * - Transmission de la durée de partie (gameDuration) au composant MatchCardSummary pour les calculs de CS/min.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import MatchCardSummary from './MatchCardSummary.jsx';
import MatchCardDivers from './MatchCardDivers.jsx';
import RoleAnalysisController from './roles/RoleAnalysisController.jsx';
import Avatar from '../ui/Avatar.jsx'; // NOUVEL IMPORT OBLIGATOIRE

const SUMMONER_SPELLS = { 4: "SummonerFlash", 11: "SummonerSmite", 12: "SummonerTeleport", 14: "SummonerDot", 7: "SummonerHeal", 6: "SummonerHaste", 3: "SummonerExhaust", 21: "SummonerBarrier", 1: "SummonerBoost", 32: "SummonerSnowball" };
const RUNE_PATHS = { 8000: "7201_Precision", 8100: "7200_Domination", 8200: "7202_Sorcery", 8300: "7203_Whimsy", 8400: "7204_Resolve" };

const QUEUE_MAPPING = {
    400: 'Draft',
    420: 'Solo/Duo',
    430: 'Normal Aveugle',
    440: 'Classé Flex',
    450: 'ARAM',
    700: 'Clash',
};

const KEYSTONE_PATHS = {
    8008: "Styles/Precision/LethalTempo/LethalTempoTemp",
    8005: "Styles/Precision/PressTheAttack/PressTheAttack",
    8010: "Styles/Precision/Conqueror/Conqueror",
    8021: "Styles/Precision/FleetFootwork/FleetFootwork",
    8112: "Styles/Domination/Electrocute/Electrocute",
    8124: "Styles/Domination/Predator/Predator",
    8128: "Styles/Domination/DarkHarvest/DarkHarvest",
    8106: "Styles/Domination/HailOfBlades/HailOfBlades",
    8214: "Styles/Sorcery/SummonAery/SummonAery",
    8229: "Styles/Sorcery/ArcaneComet/ArcaneComet",
    8230: "Styles/Sorcery/PhaseRush/PhaseRush",
    8437: "Styles/Resolve/GraspOfTheUndying/GraspOfTheUndying",
    8439: "Styles/Resolve/VeteranAftershock/VeteranAftershock",
    8465: "Styles/Resolve/Guardian/Guardian",
    8351: "Styles/Inspiration/GlacialAugment/GlacialAugment",
    8360: "Styles/Inspiration/UnsealedSpellbook/UnsealedSpellbook",
    8369: "Styles/Inspiration/FirstStrike/FirstStrike"
};

const LANE_MAPPING = {
    'TOP': 'top',
    'JUNGLE': 'jungle',
    'MIDDLE': 'mid',
    'BOTTOM': 'bot',
    'UTILITY': 'support'
};

const ROLE_ORDER = {
    'TOP': 1, 'JUNGLE': 2, 'MIDDLE': 3, 'BOTTOM': 4, 'UTILITY': 5
};

/**
 * Trie les participants de l'équipe pour correspondre à l'ordre canonique des rôles.
 * Top -> Jungle -> Mid -> Bot -> Support
 */
const sortTeamByRole = (participants) => {
    return [...participants].sort((a, b) => {
        const orderA = ROLE_ORDER[a.teamPosition] || 99;
        const orderB = ROLE_ORDER[b.teamPosition] || 99;
        return orderA - orderB;
    });
};

const MatchCard = ({ match, matchList = [], playerPuuid, versionDDragon, championMap, currentServer, onPlayerSearch }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('resume');

    const [isTimelineLoading, setIsTimelineLoading] = useState(false);
    const [fetchedTimeline, setFetchedTimeline] = useState(null);

    const info = match.info || {};
    const currentPlayer = info.participants?.find(p => p.puuid === playerPuuid);

    if (!currentPlayer) return null;

    const opponent = info.participants.find(p =>
        p.teamPosition === currentPlayer.teamPosition &&
        p.teamId !== currentPlayer.teamId &&
        p.teamPosition !== "NONE" && p.teamPosition !== ""
    );

    const isWin = currentPlayer.win;
    const durationMin = Math.floor(info.gameDuration / 60);
    const durationSec = info.gameDuration % 60;
    const timeFormatted = `${durationMin}:${durationSec < 10 ? `0${durationSec}` : durationSec}`;

    const queueId = info.queueId || match.queueId || match.queue_id || match.metadata?.queueId;
    const queueName = queueId ? (QUEUE_MAPPING[queueId] || 'Inconnu') : 'Inconnu';

    const team100 = info.participants.filter(p => p.teamId === 100);
    const team200 = info.participants.filter(p => p.teamId === 200);

    const sortedTeam100 = sortTeamByRole(team100);
    const sortedTeam200 = sortTeamByRole(team200);

    const getChampionImageName = (champId) => championMap[champId] || "Inconnu";
    const currentUserChampImage = getChampionImageName(currentPlayer.championId);
    const opponentChampImage = opponent ? getChampionImageName(opponent.championId) : null;

    const hasTimeline = match.timeline || match.raw_timeline_data || match.raw_data?.timeline || fetchedTimeline;

    const keystoneId = currentPlayer.perks?.primarySelection || currentPlayer.perks?.styles?.[0]?.selections?.[0]?.perk || currentPlayer.keystone_id;
    const keystonePath = KEYSTONE_PATHS[keystoneId] || RUNE_PATHS[currentPlayer.perks?.primaryStyle] || "7200_Domination";

    const totalCS = (currentPlayer.totalMinionsKilled || 0) + (currentPlayer.neutralMinionsKilled || 0);
    const csPerMin = info.gameDuration > 0 ? (totalCS / (info.gameDuration / 60)).toFixed(1) : "0.0";

    /**
     * Polling asynchrone pour la récupération en arrière-plan de la timeline.
     * Cette fonction vérifie le statut du cache ou de l'appel Riot côté backend
     * et pré-charge les parties adjacentes pour fluidifier l'expérience.
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
                    if (currentIndex > 0) prefetchIds.push(matchList[currentIndex - 1].metadata?.matchId || matchList[currentIndex - 1].match_id);
                    if (currentIndex < matchList.length - 1) prefetchIds.push(matchList[currentIndex + 1].metadata?.matchId || matchList[currentIndex + 1].match_id);
                }

                if (prefetchIds.length > 0) {
                    fetch(`http://localhost:8000/api/v1/matches/${matchId}/timeline/status?puuid=${playerPuuid}&server=${currentServer}&prefetch_ids=${prefetchIds.join(',')}`).catch(() => { });
                }
            } catch (e) { }
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
    const kdaRatio = currentPlayer.deaths > 0
        ? ((currentPlayer.kills + currentPlayer.assists) / currentPlayer.deaths).toFixed(2)
        : 'Parfait';

    return (
        <div className={`mb-3 glass-panel border-l-4 overflow-hidden transition-all duration-200 ease-in-out ${accentClass}`}>
            <div onClick={handleCardClick} className="px-5 py-4 flex items-center justify-between w-full select-none cursor-pointer hover:bg-white/5 transition-colors">

                {/* 1. Bloc Métadonnées */}
                <div className="w-[80px] shrink-0 flex flex-col items-center justify-center text-center">
                    <div className="text-gray-100 font-bold text-xs uppercase tracking-wide">
                        {queueName}
                    </div>
                    <div className="text-lol-textMuted text-xs font-medium mt-1">
                        {timeFormatted}
                    </div>
                </div>

                {/* 2. Bloc Affrontement (Matchup) */}
                <div className="flex items-center justify-center w-[80px] shrink-0">
                    <div className="relative w-[80px] h-16">

                        {/* Adversaire (Arrière-plan, décalé en haut à droite) */}
                        {opponent && (
                            <div className="absolute top-0 right-0 z-0">
                                <Avatar
                                    type="champion"
                                    size="base"
                                    src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/champion/${opponentChampImage}.png`}
                                    alt="Opponent"
                                    className="brightness-75 grayscale-[20%]"
                                />
                                {/* Badge VS (Passage de bg-surface-elevated à bg-surface-solid pour l'harmonie) */}
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-surface-solid border border-border-strong rounded-md flex items-center justify-center text-[9px] font-bold text-lol-textMuted shadow-sm z-10">
                                    VS
                                </div>
                            </div>
                        )}

                        {/* Joueur (Premier plan, décalé en bas à gauche) */}
                        <div className="absolute bottom-0 left-0 z-10">
                            <Avatar
                                type="champion"
                                size="md"
                                src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/champion/${currentUserChampImage}.png`}
                                alt={currentUserChampImage}
                                className="shadow-md"
                            />
                            {/* Badge Lane */}
                            {currentPlayer.teamPosition && (
                                <div className="absolute -bottom-1.5 -left-1.5 z-20">
                                    <Avatar
                                        type="rune"
                                        size="xs"
                                        src={`/assets/lanes/${LANE_MAPPING[currentPlayer.teamPosition] || currentPlayer.teamPosition.toLowerCase()}.png`}
                                        alt={currentPlayer.teamPosition}
                                        className="shadow-sm"
                                    />
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* 3. Bloc Performances */}
                <div className="flex items-center justify-center gap-4 shrink-0 w-[160px]">
                    <div className="text-center w-[80px]">
                        <div className="text-gray-100 font-bold text-sm">
                            {currentPlayer.kills} / <span className="text-lol-loss">{currentPlayer.deaths}</span> / {currentPlayer.assists}
                        </div>
                        <div className="text-lol-textMuted text-xs mt-0.5 font-medium">
                            {kdaRatio} KDA
                        </div>
                    </div>

                    <div className="text-center w-[60px]">
                        <div className="text-gray-100 font-bold text-sm flex items-center justify-center">
                            {totalCS} <span className="text-lol-textMuted text-[10px] uppercase tracking-wider ml-1">CS</span>
                        </div>
                        <div className="text-lol-textMuted text-xs mt-0.5 font-medium">
                            {csPerMin} / min
                        </div>
                    </div>
                </div>

                {/* 4. Bloc Équipement */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex gap-1 items-center shrink-0">
                        <div className="flex flex-col gap-0.5">
                            {[currentPlayer.summoner1Id, currentPlayer.summoner2Id].map((id, index) => (
                                <Avatar
                                    key={index}
                                    type="spell"
                                    size="xs"
                                    src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/spell/${SUMMONER_SPELLS[id] || "SummonerFlash"}.png`}
                                    alt="Sort"
                                />
                            ))}
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <Avatar
                                type="rune"
                                size="xs"
                                src={`https://ddragon.leagueoflegends.com/cdn/img/perk-images/${keystonePath}.png`}
                                alt="Keystone"
                            />
                            <Avatar
                                type="rune"
                                size="xs"
                                src={`https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/${RUNE_PATHS[currentPlayer.perks?.subStyle] || "7201_Precision"}.png`}
                                alt="Rune secondaire"
                                className="opacity-70"
                            />
                        </div>
                    </div>

                    <div className="flex gap-1 shrink-0">
                        {[currentPlayer.item0, currentPlayer.item1, currentPlayer.item2, currentPlayer.item3, currentPlayer.item4, currentPlayer.item5, currentPlayer.item6].map((itemId, idx) => (
                            itemId > 0 ? (
                                <Avatar
                                    key={idx}
                                    type="item"
                                    size="sm"
                                    src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/item/${itemId}.png`}
                                    alt="Objet"
                                />
                            ) : (
                                <div key={idx} className="w-7 h-7 bg-surface-solid rounded-md border border-border-glass shrink-0"></div>
                            )
                        ))}
                    </div>
                </div>

                {/* 5. Bloc Compositions */}
                <div className="flex flex-col gap-[3px] shrink-0 w-[110px]">
                    <div className="flex gap-[2px]">
                        {sortedTeam100.map(p => (
                            <Avatar
                                key={p.puuid}
                                type="champion"
                                size="xs"
                                isSelected={p.puuid === playerPuuid}
                                src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/champion/${getChampionImageName(p.championId)}.png`}
                                alt={getChampionImageName(p.championId)}
                                className={p.puuid !== playerPuuid ? "opacity-80" : ""}
                            />
                        ))}
                    </div>
                    <div className="flex gap-[2px]">
                        {sortedTeam200.map(p => (
                            <Avatar
                                key={p.puuid}
                                type="champion"
                                size="xs"
                                isSelected={p.puuid === playerPuuid}
                                src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/champion/${getChampionImageName(p.championId)}.png`}
                                alt={getChampionImageName(p.championId)}
                                className={p.puuid !== playerPuuid ? "opacity-80" : ""}
                            />
                        ))}
                    </div>
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
                        <MatchCardSummary team100={team100} team200={team200} playerPuuid={playerPuuid} versionDDragon={versionDDragon} championMap={championMap} currentServer={currentServer} onPlayerSearch={onPlayerSearch} gameDuration={info.gameDuration} />
                    )}

                    {activeTab === 'role_analysis' && (
                        <RoleAnalysisController
                            matchId={match.metadata?.matchId || match.match_id}
                            puuid={playerPuuid}
                            role={currentPlayer.teamPosition}
                            isTimelineLoading={isTimelineLoading}
                            versionDDragon={versionDDragon}
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