/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/roles/support/SupportCombatView.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Conteneur maître de la vue experte Combat dédiée au rôle de Support.
 * Utilise désormais le composant StatCard du System Design pour garantir
 * une uniformité visuelle parfaite des blocs de statistiques.
 * ============================================================================
 */

import React from 'react';
import SupportCombatChart from './SupportCombatChart.jsx';
import StatDelta from '../../../ui/StatDelta.jsx';
import CircularGauge from '../../../ui/CircularGauge.jsx';
import StatCard from '../../../ui/StatCard.jsx';

const SupportCombatView = ({ data }) => {
    /**
     * Formate une durée brute vers un format lisible (Minutes:Secondes).
     * 
     * @param {number} time - La durée numérique brute à formater.
     * @param {boolean} isMilliseconds - Flag d'ajustement de la base temporelle.
     * @returns {string} - Chaîne formatée (ex: "14:05").
     */
    const formatAxisTime = (time, isMilliseconds = true) => {
        if (time === undefined || time === null) return "N/A";
        const totalSeconds = isMilliseconds ? Math.floor(time / 1000) : Math.floor(time);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (!data) return null;

    if (data.archetype === 'VANGUARD') {
        return (
            <div className="flex flex-col gap-4 mt-2 w-full animate-in fade-in zoom-in-95 duration-200">
                {/* LIGNE 1 : SCORE ET JAUGES */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <StatCard
                        title="Absorption des dégâts"
                        footer={
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider">Post-mitigation :</span>
                                <span className="text-gray-200 font-bold text-sm">{(data.totalDamageTaken || 0).toLocaleString()}</span>
                                <StatDelta value={data.totalDamageTaken} opponentValue={data.totalDamageTakenOpponent} type="number" showBackground={true} />
                            </div>
                        }
                    >
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-gray-100 font-bold text-4xl" title="Dégâts mitigés">
                                {(data.damageSelfMitigated || 0).toLocaleString()}
                            </span>
                            <StatDelta value={data.damageSelfMitigated} opponentValue={data.damageSelfMitigatedOpponent} showBackground={true} />
                        </div>
                    </StatCard>

                    <div className="h-full">
                        <CircularGauge
                            label="Poids Défensif (%)"
                            value={(data.damageTakenOnTeamPercentage || 0) * 100}
                            opponentValue={(data.damageTakenOnTeamPercentageOpponent || 0) * 100}
                            color="text-lol-info"
                        />
                    </div>

                    <div className="h-full">
                        <CircularGauge
                            label="Participation aux éliminations (%)"
                            value={(data.killParticipation || 0) * 100}
                            opponentValue={(data.killParticipationOpponent || 0) * 100}
                            color="text-lol-info"
                        />
                    </div>
                </div>

                {/* LIGNE 2 : GRAPHIQUE TEMPOREL */}
                <SupportCombatChart
                    chartData={data.timelineGraph?.damage_graph}
                    title="Évolution de l'encaissement"
                />

                {/* LIGNE 3 : EXPERTISE MÉCANIQUE */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <StatCard title="Durée de Contrôle">
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-gray-100 font-bold text-3xl">{formatAxisTime(data.timeCCingOthers, false)}</span>
                            <StatDelta value={data.timeCCingOthers} opponentValue={data.timeCCingOthersOpponent} type="time" showBackground={true} />
                        </div>
                    </StatCard>

                    <StatCard title="Qualité d'Engagement">
                        <div className="flex flex-col gap-4 w-full px-2">
                            <div className="flex justify-between items-center w-full">
                                <span className="text-gray-200 text-xs font-medium">Immobilisations</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-lol-info font-bold">{data.enemyChampionImmobilizations}</span>
                                    <StatDelta value={data.enemyChampionImmobilizations} opponentValue={data.enemyChampionImmobilizationsOpponent} showBackground={true} />
                                </div>
                            </div>
                            <div className="flex justify-between items-center w-full">
                                <span className="text-gray-200 text-xs font-medium">Aides létales sous contrôle</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-100 font-bold">{data.immobilizeAndKillWithAlly}</span>
                                    <StatDelta value={data.immobilizeAndKillWithAlly} opponentValue={data.immobilizeAndKillWithAllyOpponent} showBackground={true} />
                                </div>
                            </div>
                        </div>
                    </StatCard>

                    <StatCard title="Survies aux Bursts">
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-gray-100 font-bold text-3xl">{data.tookLargeDamageSurvived}</span>
                            <StatDelta value={data.tookLargeDamageSurvived} opponentValue={data.tookLargeDamageSurvivedOpponent} showBackground={true} />
                        </div>
                    </StatCard>
                </div>
            </div>
        );
    }

    // Vue par défaut (ARTILLERY)
    return (
        <div className="flex flex-col gap-4 mt-2 w-full animate-in fade-in zoom-in-95 duration-200">
            {/* LIGNE 1 : SCORE ET JAUGES */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <StatCard
                    title="Dégâts aux Champions"
                    footer={
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider">Ratio par minute :</span>
                            <span className="text-gray-200 font-bold text-sm">{data.damagePerMinute?.toFixed(0)}</span>
                            <StatDelta value={data.damagePerMinute} opponentValue={data.damagePerMinuteOpponent} type="number" showBackground={true} />
                        </div>
                    }
                >
                    <div className="flex items-center justify-center gap-3">
                        <span className="text-gray-100 font-bold text-4xl">
                            {(data.damageToChampions || 0).toLocaleString()}
                        </span>
                        <StatDelta value={data.damageToChampions} opponentValue={data.damageToChampionsOpponent} showBackground={true} />
                    </div>
                </StatCard>

                <div className="h-full">
                    <CircularGauge
                        label="Poids Offensif (%)"
                        value={(data.teamDamagePercentage || 0) * 100}
                        opponentValue={(data.teamDamagePercentageOpponent || 0) * 100}
                        color="text-lol-info"
                    />
                </div>

                <div className="h-full">
                    <CircularGauge
                        label="Participation aux éliminations (%)"
                        value={(data.killParticipation || 0) * 100}
                        opponentValue={(data.killParticipationOpponent || 0) * 100}
                        color="text-lol-info"
                    />
                </div>
            </div>

            {/* LIGNE 2 : GRAPHIQUE TEMPOREL */}
            <SupportCombatChart
                chartData={data.timelineGraph?.damage_graph}
                title="Évolution de la pression offensive"
            />

            {/* LIGNE 3 : EXPERTISE MÉCANIQUE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <StatCard title="Harcèlement (Avant 14m)">
                    <div className="flex items-center justify-center gap-3">
                        <span className="text-gray-100 font-bold text-3xl">{data.landSkillShotsEarlyGame}</span>
                        <StatDelta value={data.landSkillShotsEarlyGame} opponentValue={data.landSkillShotsEarlyGameOpponent} showBackground={true} />
                    </div>
                </StatCard>

                <StatCard title="Maîtrise Balistique">
                    <div className="flex flex-col gap-4 w-full px-2">
                        <div className="flex justify-between items-center w-full">
                            <span className="text-gray-200 text-xs font-medium">Sorts touchés</span>
                            <div className="flex items-center gap-2">
                                <span className="text-lol-info font-bold">{data.skillshotsHit}</span>
                                <StatDelta value={data.skillshotsHit} opponentValue={data.skillshotsHitOpponent} showBackground={true} />
                            </div>
                        </div>
                        <div className="flex justify-between items-center w-full">
                            <span className="text-gray-200 text-xs font-medium">Sorts esquivés</span>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-100 font-bold">{data.skillshotsDodged}</span>
                                <StatDelta value={data.skillshotsDodged} opponentValue={data.skillshotsDodgedOpponent} showBackground={true} />
                            </div>
                        </div>
                    </div>
                </StatCard>

                <StatCard title="Positionnement & Sécurité">
                    <div className="flex items-center justify-center gap-3">
                        <span className="text-gray-100 font-bold text-3xl">{formatAxisTime(data.longestTimeSpentLiving * 1000)}</span>
                        <StatDelta value={data.longestTimeSpentLiving} opponentValue={data.longestTimeSpentLivingOpponent} type="time" showBackground={true} />
                    </div>
                </StatCard>
            </div>
        </div>
    );
};

export default SupportCombatView;