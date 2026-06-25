/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/MatchCardRoleJungle.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Sous-composant analytique exhaustif pour le rôle de Jungler.
 * Intègre un Skeleton Loader dynamique (animate-pulse) bloquant le rendu
 * tant que la Timeline est en cours de téléchargement via le Polling.
 * ============================================================================
 */

import React from 'react';

const MatchCardRoleJungle = ({ match, currentPlayer, opponent, isTimelineLoading }) => {

    /**
     * INTERCEPTION DU RENDU : Le Skeleton Loader
     * Remplace visuellement les données manquantes par des blocs pulsants
     * respectant au pixel près la grille de l'interface finale.
     */
    if (isTimelineLoading) {
        return (
            <div className="mt-2 flex flex-col gap-6 p-2 animate-pulse">
                {/* CATÉGORIE 1 : RESSOURCES (Skeleton) */}
                <div>
                    <div className="h-[12px] w-24 bg-lol-gold/30 rounded-sm mb-3"></div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-lol-dark/30 border border-lol-border/20 rounded-sm p-3 h-28"></div>
                        ))}
                    </div>
                </div>

                {/* CATÉGORIE 2 : OBJECTIFS (Skeleton) */}
                <div>
                    <div className="h-[12px] w-36 bg-lol-gold/30 rounded-sm mb-3"></div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="bg-lol-dark/30 border border-lol-border/20 rounded-sm p-3 h-16"></div>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-[#1a0f14]/40 border border-lol-border/20 rounded-sm p-3 h-20"></div>
                        ))}
                    </div>
                </div>

                {/* CATÉGORIE 3 : COMBAT (Skeleton) */}
                <div>
                    <div className="h-[12px] w-16 bg-lol-gold/30 rounded-sm mb-3"></div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-lol-dark/30 border border-lol-border/20 rounded-sm p-3 h-20"></div>
                        ))}
                    </div>
                </div>

                {/* CATÉGORIE 4 : VISION (Skeleton) */}
                <div>
                    <div className="h-[12px] w-16 bg-lol-gold/30 rounded-sm mb-3"></div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-lol-dark/30 border border-lol-border/20 rounded-sm p-3 h-20"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const p = currentPlayer;
    const c = p.challenges || {};
    const o = opponent?.challenges || {};
    const teams = match.info.teams || [];
    const participants = match.info.participants || [];

    const getObjectiveTotal = (objectiveKey) => {
        return teams.reduce((sum, team) => sum + (team.objectives?.[objectiveKey] || 0), 0);
    };

    const formatTime = (secondsFloat) => {
        if (!secondsFloat) return "N/A";
        const m = Math.floor(secondsFloat / 60);
        const s = Math.floor(secondsFloat % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const renderDelta = (playerVal = 0, opponentVal = 0, isPercentage = false) => {
        if (!opponent) return <span className="text-gray-500 font-bold ml-2 text-xs">N/A</span>;
        const delta = playerVal - opponentVal;

        const formattedDelta = isPercentage ? delta.toFixed(1) : Math.round(delta);
        const suffix = isPercentage ? '%' : '';

        if (delta > 0) return <span className="text-green-400 font-bold ml-2 text-xs">+{formattedDelta}{suffix}</span>;
        if (delta < 0) return <span className="text-red-400 font-bold ml-2 text-xs">{formattedDelta}{suffix}</span>;
        return <span className="text-gray-400 font-bold ml-2 text-xs">0{suffix}</span>;
    };

    const isValid = (val) => val !== undefined && val !== null;

    const totalDragons = getObjectiveTotal('dragon');
    const totalBarons = getObjectiveTotal('baron');
    const totalGrubs = getObjectiveTotal('horde');
    const totalHeralds = getObjectiveTotal('riftHerald');
    const totalAtakhans = getObjectiveTotal('atakhan');
    const totalScuttles = participants.reduce((sum, part) => sum + (part.challenges?.scuttleCrabKills || 0), 0);

    const myTeam = teams.find(t => t.teamId === p.teamId) || {};
    const teamObj = myTeam.objectives || {};

    const teamDragons = teamObj.dragon || 0;
    const teamBarons = teamObj.baron || 0;
    const teamGrubs = teamObj.horde || 0;
    const teamHeralds = teamObj.riftHerald || 0;
    const teamAtakhans = teamObj.atakhan || 0;

    const totalCS = (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0);

    const allyJungleCS = p.totalAllyJungleMinionsKilled || 0;
    const enemyJungleCS = p.totalEnemyJungleMinionsKilled || 0;
    const pureJungleMonstersCS = allyJungleCS + enemyJungleCS;
    const pureJungleCamps = pureJungleMonstersCS / 4;

    const scuttles = c.scuttleCrabKills || 0;
    const scuttlesCS = scuttles * 4;

    const epicMonstersAchieved = (p.dragonKills || 0) + (p.baronKills || 0) + (c.voidMonsterKill || 0);
    const epicMonstersCS = ((p.dragonKills || 0) + (p.baronKills || 0)) * 4 + (c.voidMonsterKill || 0) * 2;

    const hasEpicSteal = c.epicMonsterSteals > 0;
    const hasPressureSmite = c.epicMonsterKillsNearEnemyJungler > 0;
    const hasHumiliationSteal = c.epicMonsterStolenWithoutSmite > 0;
    const showSmitesBox = hasEpicSteal || hasPressureSmite || hasHumiliationSteal;

    const hasPink = p.visionWardsBoughtInGame > 0;
    const hasDetector = p.detectorWardsPlaced > 0;
    const hasStealth = p.stealthWardsPlaced > 0;
    const showWardsBox = hasPink || hasDetector || hasStealth;

    const hasAnyEpicMonster = totalDragons > 0 || totalBarons > 0 || totalGrubs > 0 || totalHeralds > 0 || totalAtakhans > 0;

    return (
        <div className="mt-2 flex flex-col gap-6 p-2">

            {/* CATÉGORIE 1 : RESSOURCES */}
            <div>
                <h4 className="text-lol-gold text-[10px] font-bold uppercase tracking-widest border-b border-lol-border pb-1 mb-2">
                    Ressources
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-lol-dark/50 border border-lol-border rounded-sm p-3 text-center flex flex-col justify-center">
                        <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Score de Sbires (CS)</div>
                        <div className="text-white font-bold text-lg">{totalCS}</div>
                        <div className="text-gray-500 text-[9px] mt-2 flex flex-col gap-0.5 text-left w-max mx-auto">
                            <span>• <span className="text-white">{p.totalMinionsKilled || 0}</span> Sbires (Lane)</span>
                            <span>• <span className="text-white">{pureJungleCamps}</span> Camps (<span className="text-lol-gold">{pureJungleMonstersCS} CS</span>)</span>
                            <span>• <span className="text-white">{scuttles}</span> Carapateurs (<span className="text-lol-gold">{scuttlesCS} CS</span>)</span>
                            <span>• <span className="text-white">{epicMonstersAchieved}</span> Objectifs (<span className="text-lol-gold">{epicMonstersCS} CS</span>)</span>
                        </div>
                    </div>

                    <div className="bg-lol-dark/50 border border-lol-border rounded-sm p-3 text-center flex flex-col justify-center">
                        <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Camps de Jungle purs</div>
                        <div className="text-white font-bold text-sm mt-1">
                            {allyJungleCS / 4} <span className="text-gray-500 text-[10px]">({allyJungleCS} CS)</span> Alliés
                        </div>
                        <div className="text-[#00ffff] font-bold text-sm mt-0.5">
                            {enemyJungleCS / 4} <span className="text-[#00ffff]/60 text-[10px]">({enemyJungleCS} CS)</span> Ennemis
                        </div>
                        {c.buffsStolen > 0 && (
                            <div className="text-lol-gold text-xs font-bold mt-2 pt-2 border-t border-lol-border/50">
                                Buffs volés : {c.buffsStolen}
                            </div>
                        )}
                    </div>

                    <div className="bg-lol-dark/50 border border-lol-border rounded-sm p-3 text-center">
                        <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Golds Générés</div>
                        <div className="text-white font-bold text-lg">{p.goldEarned?.toLocaleString('fr-FR') || 0}</div>
                        <div className="mt-1">{renderDelta(p.goldEarned, opponent?.goldEarned)}</div>
                    </div>

                    <div className="bg-lol-dark/50 border border-lol-border rounded-sm p-3 text-center">
                        <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Rythme Avant 10m</div>
                        <div className="text-white font-bold text-lg">{Math.round(c.jungleCsBefore10Minutes || 0)} cs</div>
                    </div>
                </div>
            </div>

            {/* CATÉGORIE 2 : CONTRÔLE DES OBJECTIFS */}
            <div>
                <h4 className="text-lol-gold text-[10px] font-bold uppercase tracking-widest border-b border-lol-border pb-1 mb-2">
                    Contrôle des Objectifs
                </h4>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {totalScuttles > 0 && (
                        <div className="bg-lol-dark/50 border border-lol-border rounded-sm p-3 text-center">
                            <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Rivière (Carapateurs)</div>
                            <div className="text-white font-bold text-lg">{c.scuttleCrabKills || 0} <span className="text-gray-500 text-sm">/ {totalScuttles}</span></div>
                            <div className="text-lol-gold text-[9px] mt-1">Inclus 1er spawn : {c.initialCrabCount || 0}</div>
                        </div>
                    )}

                    {showSmitesBox && (
                        <div className="bg-lol-dark/50 border border-yellow-500/30 rounded-sm p-3 text-center shadow-[0_0_10px_rgba(234,179,8,0.05)]">
                            <div className="text-yellow-500/70 text-[10px] uppercase font-bold tracking-wider mb-1">Efficacité Smites (Épique)</div>
                            <div className="text-white text-xs mt-1 flex flex-col gap-0.5">
                                {hasEpicSteal && <span>Vols d'objectifs : <span className="font-bold text-yellow-400">{c.epicMonsterSteals}</span></span>}
                                {hasPressureSmite && <span>Smites sous pression : <span className="font-bold text-[#00ffff]">{c.epicMonsterKillsNearEnemyJungler}</span></span>}
                                {hasHumiliationSteal && <span className="text-red-400 font-bold text-[9px]">Humiliation (Vol sans smite) : {c.epicMonsterStolenWithoutSmite}</span>}
                            </div>
                        </div>
                    )}

                    {hasAnyEpicMonster && (
                        <div className="bg-lol-dark/50 border border-lol-border rounded-sm p-3 text-center">
                            <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Dégâts monstres épiques</div>
                            <div className="text-white font-bold text-lg">{p.damageDealtToEpicMonsters?.toLocaleString('fr-FR') || 0}</div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {totalDragons > 0 && (
                        <div className="bg-[#1a0f14] border border-red-900/50 rounded-sm p-3 text-center flex flex-col justify-between">
                            <div>
                                <div className="text-red-400 text-[10px] uppercase font-bold tracking-wider mb-1">Dragons</div>
                                <div className="text-white font-bold text-xl">{teamDragons} <span className="text-gray-500 text-sm">/ {totalDragons}</span></div>
                            </div>
                            <div className="mt-2">
                                <div className="text-gray-300 text-[9px] font-bold">Smites perso : {p.dragonKills || 0}</div>
                                {isValid(c.earliestDragonTakedown) && <div className="text-gray-500 text-[8px]">1er à {formatTime(c.earliestDragonTakedown)}</div>}
                            </div>
                        </div>
                    )}

                    {totalGrubs > 0 && (
                        <div className="bg-[#140f1a] border border-purple-900/50 rounded-sm p-3 text-center flex flex-col justify-between">
                            <div>
                                <div className="text-purple-400 text-[10px] uppercase font-bold tracking-wider mb-1">Grubs</div>
                                <div className="text-white font-bold text-xl">{teamGrubs} <span className="text-gray-500 text-sm">/ {totalGrubs}</span></div>
                            </div>
                            <div className="mt-2">
                                <div className="text-gray-500 text-[8px] uppercase">Effort d'Équipe</div>
                            </div>
                        </div>
                    )}

                    {totalHeralds > 0 && (
                        <div className="bg-[#1a0f1a] border border-fuchsia-900/50 rounded-sm p-3 text-center flex flex-col justify-between">
                            <div>
                                <div className="text-fuchsia-400 text-[10px] uppercase font-bold tracking-wider mb-1">Héraut</div>
                                <div className="text-white font-bold text-xl">{teamHeralds} <span className="text-gray-500 text-sm">/ {totalHeralds}</span></div>
                            </div>
                            <div className="mt-2">
                                <div className="text-gray-500 text-[8px] uppercase">Effort d'Équipe</div>
                            </div>
                        </div>
                    )}

                    {totalBarons > 0 && (
                        <div className="bg-[#0f1a18] border border-emerald-900/50 rounded-sm p-3 text-center flex flex-col justify-between">
                            <div>
                                <div className="text-emerald-400 text-[10px] uppercase font-bold tracking-wider mb-1">Barons</div>
                                <div className="text-white font-bold text-xl">{teamBarons} <span className="text-gray-500 text-sm">/ {totalBarons}</span></div>
                            </div>
                            <div className="mt-2">
                                <div className="text-gray-300 text-[9px] font-bold">Smites perso : {p.baronKills || 0}</div>
                                {isValid(c.earliestBaron) && <div className="text-gray-500 text-[8px]">1er à {formatTime(c.earliestBaron)}</div>}
                            </div>
                        </div>
                    )}

                    {totalAtakhans > 0 && (
                        <div className="bg-[#1a0f0f] border border-orange-900/50 rounded-sm p-3 text-center flex flex-col justify-between">
                            <div>
                                <div className="text-orange-400 text-[10px] uppercase font-bold tracking-wider mb-1">Atakhan</div>
                                <div className="text-white font-bold text-xl">{teamAtakhans} <span className="text-gray-500 text-sm">/ {totalAtakhans}</span></div>
                            </div>
                            <div className="mt-2">
                                <div className="text-gray-500 text-[8px] uppercase">Nouvel Objectif</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* CATÉGORIE 3 : COMBAT */}
            <div>
                <h4 className="text-lol-gold text-[10px] font-bold uppercase tracking-widest border-b border-lol-border pb-1 mb-2">
                    Combat
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-lol-dark/50 border border-lol-border rounded-sm p-3 text-center">
                        <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Dégâts aux Champions</div>
                        <div className="text-white font-bold text-lg">{p.totalDamageDealtToChampions?.toLocaleString('fr-FR') || 0}</div>
                        <div className="mt-1">{renderDelta(p.totalDamageDealtToChampions, opponent?.totalDamageDealtToChampions)}</div>
                    </div>

                    <div className="bg-lol-dark/50 border border-lol-border rounded-sm p-3 text-center">
                        <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Participation (KP)</div>
                        <div className="text-white font-bold text-lg">{((c.killParticipation || 0) * 100).toFixed(0)}%</div>
                        <div className="mt-1">{renderDelta((c.killParticipation || 0) * 100, (o.killParticipation || 0) * 100, true)}</div>
                    </div>

                    {c.killsOnLanersEarlyJungleAsJungler > 0 && (
                        <div className="bg-lol-dark/50 border border-lol-gold/30 rounded-sm p-3 text-center">
                            <div className="text-lol-gold/70 text-[10px] uppercase font-bold tracking-wider mb-1">Ganks Réussis (&lt;10m)</div>
                            <div className="text-white font-bold text-lg">{c.killsOnLanersEarlyJungleAsJungler}</div>
                        </div>
                    )}

                    <div className="bg-lol-dark/50 border border-lol-border rounded-sm p-3 text-center">
                        <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Utilité au Combat</div>
                        <div className="text-white text-xs mt-1">Temps CC : <span className="font-bold">{p.timeCCingOthers || 0}s</span></div>
                        <div className="text-white text-xs mt-0.5">Kills sur contestation : <span className="font-bold">{c.junglerTakedownsNearDamagedEpicMonster || 0}</span></div>
                    </div>

                    {c.junglerKillsEarlyJungle > 0 && (
                        <div className="bg-lol-dark/50 border border-lol-gold/30 rounded-sm p-3 text-center">
                            <div className="text-lol-gold/70 text-[10px] uppercase font-bold tracking-wider mb-1">Duels Jungle Gagnés</div>
                            <div className="text-white font-bold text-lg">{c.junglerKillsEarlyJungle}</div>
                        </div>
                    )}

                    {c.takedownsBeforeJungleMinionSpawn > 0 && (
                        <div className="bg-lol-dark/50 border border-lol-gold/30 rounded-sm p-3 text-center">
                            <div className="text-lol-gold/70 text-[10px] uppercase font-bold tracking-wider mb-1">Impact Invade Niv. 1</div>
                            <div className="text-white font-bold text-lg">{c.takedownsBeforeJungleMinionSpawn}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* CATÉGORIE 4 : VISION */}
            <div>
                <h4 className="text-lol-gold text-[10px] font-bold uppercase tracking-widest border-b border-lol-border pb-1 mb-2">
                    Vision
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-lol-dark/50 border border-lol-border rounded-sm p-3 text-center">
                        <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Score de Vision</div>
                        <div className="text-white font-bold text-lg">{p.visionScore || 0}</div>
                        <div className="mt-1">{renderDelta(p.visionScore, opponent?.visionScore)}</div>
                    </div>

                    <div className="bg-lol-dark/50 border border-lol-border rounded-sm p-3 text-center">
                        <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Delta de Vision</div>
                        <div className="text-white font-bold text-lg">
                            {c.visionScoreAdvantageLaneOpponent > 0 ? <span className="text-green-400">+{c.visionScoreAdvantageLaneOpponent.toFixed(1)}</span> : <span className="text-red-400">{c.visionScoreAdvantageLaneOpponent?.toFixed(1) || 0}</span>}
                        </div>
                        <div className="text-gray-500 text-[9px] mt-1">Ratio : {c.visionScorePerMinute?.toFixed(1) || 0} / minute</div>
                    </div>

                    {showWardsBox && (
                        <div className="bg-lol-dark/50 border border-pink-900/50 rounded-sm p-3 text-center">
                            <div className="text-pink-400/80 text-[10px] uppercase font-bold tracking-wider mb-1">Wards Posées</div>
                            <div className="text-white text-xs mt-1 flex flex-col gap-0.5">
                                {hasPink && <span>Pink Wards (Shop) : <span className="font-bold text-pink-400">{p.visionWardsBoughtInGame}</span></span>}
                                {hasDetector && <span>Balises Contrôle : <span className="font-bold">{p.detectorWardsPlaced}</span></span>}
                                {hasStealth && <span>Balises Invisibles : <span className="font-bold">{p.stealthWardsPlaced}</span></span>}
                            </div>
                        </div>
                    )}

                    <div className="bg-lol-dark/50 border border-lol-border rounded-sm p-3 text-center">
                        <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Wards Détruites</div>
                        <div className="text-white font-bold text-lg">{c.wardTakedowns || 0}</div>
                        <div className="text-gray-500 text-[9px] mt-1">Dont {c.wardTakedownsBefore20M || 0} avant 20m</div>
                    </div>
                </div>
            </div>

            {/* ========================================================
                BLOC TEMPORAIRE DE VÉRIFICATION : DÉTAILS VS TIMELINE
                ======================================================== */}
            {(() => {
                const participantId = participants.findIndex(part => part.puuid === p.puuid) + 1;
                const frames = match.timeline?.info?.frames || match.raw_timeline_data?.info?.frames || match.raw_data?.timeline?.info?.frames || [];
                const events = frames.flatMap(f => f.events || []);
                const lastFrame = frames[frames.length - 1];

                const timelineJungleCS = lastFrame?.participantFrames?.[participantId]?.jungleMinionsKilled || 0;
                const timelineKills = events.filter(e => e.type === 'CHAMPION_KILL' && e.killerId === participantId).length;
                const timelineDragons = events.filter(e => e.type === 'ELITE_MONSTER_KILL' && e.monsterType === 'DRAGON' && e.killerId === participantId).length;

                const detailsJungleCS = p.neutralMinionsKilled || 0;
                const detailsKills = p.kills || 0;
                const detailsDragons = p.dragonKills || 0;

                const getStatus = (val1, val2) => val1 === val2
                    ? <span className="text-green-400 font-bold">MATCH ✓</span>
                    : <span className="text-red-400 font-bold">ÉCART ✗</span>;

                return (
                    <div className="mt-6 border-2 border-dashed border-[#00ffff]/50 bg-[#00ffff]/5 rounded-sm p-4">
                        <h4 className="text-[#00ffff] text-[10px] font-bold uppercase tracking-widest border-b border-[#00ffff]/30 pb-1 mb-3 text-center">
                            Labo de Test : Ingestion Timeline (Dev)
                        </h4>
                        <div className="grid grid-cols-1 gap-2 text-xs">
                            <div className="flex justify-between bg-black/40 p-2 rounded-sm border border-white/5">
                                <span className="text-gray-400 w-1/3">Combat (Kills)</span>
                                <span className="text-white w-1/4 text-center">Détails: {detailsKills}</span>
                                <span className="text-[#00ffff] w-1/4 text-center">Timeline: {timelineKills}</span>
                                <span className="w-1/4 text-right">{getStatus(detailsKills, timelineKills)}</span>
                            </div>

                            <div className="flex justify-between bg-black/40 p-2 rounded-sm border border-white/5">
                                <span className="text-gray-400 w-1/3">Farm (Jungle CS)</span>
                                <span className="text-white w-1/4 text-center">Détails: {detailsJungleCS}</span>
                                <span className="text-[#00ffff] w-1/4 text-center">Timeline: {timelineJungleCS}</span>
                                <span className="w-1/4 text-right">{getStatus(detailsJungleCS, timelineJungleCS)}</span>
                            </div>

                            <div className="flex justify-between bg-black/40 p-2 rounded-sm border border-white/5">
                                <span className="text-gray-400 w-1/3">Objectifs (Dragons)</span>
                                <span className="text-white w-1/4 text-center">Détails: {detailsDragons}</span>
                                <span className="text-[#00ffff] w-1/4 text-center">Timeline: {timelineDragons}</span>
                                <span className="w-1/4 text-right">{getStatus(detailsDragons, timelineDragons)}</span>
                            </div>
                        </div>
                    </div>
                );
            })()}

        </div>
    );
};

export default MatchCardRoleJungle;