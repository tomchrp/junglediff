/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/roles/support/SupportCombatView.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Conteneur maître de la vue experte Combat pour le Support.
 * * CORRECTIONS SYSTEM DESIGN :
 * - Toutes les jauges utilisent `text-lol-info` (bleu standard).
 * - Hiérarchie restaurée : Dégâts totaux en métrique primaire (au centre), 
 * Ratio par minute (DPM) en métrique secondaire.
 * ============================================================================
 */

import React from 'react';
import SupportCombatChart from './SupportCombatChart.jsx';
import StatDelta from '../../../ui/StatDelta.jsx';
import CircularGauge from '../../../ui/CircularGauge.jsx';

const SupportCombatView = ({ data }) => {
    if (!data) return null;

    const formatAxisTime = (ms) => {
        if (!ms) return "N/A";
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col gap-4 mt-2 w-full animate-in fade-in zoom-in-95 duration-200">
            
            {/* LIGNE 1 : SCORE ET JAUGES */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* Carte Standard : Dégâts Totaux (Centrée) */}
                <div className="bg-surface-solid border border-border-glass rounded-md p-4 flex flex-col items-center text-center h-full">
                    <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-3">
                        Dégâts aux Champions
                    </div>
                    
                    {/* Coeur : Statistique Primaire (Dégâts Totaux) */}
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <span className="text-gray-100 font-bold text-4xl">
                            {(data.damageToChampions || 0).toLocaleString()}
                        </span>
                        <StatDelta value={data.damageToChampions} opponentValue={data.damageToChampionsOpponent} showBackground={true} />
                    </div>

                    {/* Coeur : Statistique Secondaire (Ratio / minute) */}
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider">Ratio :</span>
                        <span className="text-gray-200 font-bold text-sm">{data.damagePerMinute?.toFixed(0)}/m</span>
                        <StatDelta value={data.damagePerMinute} opponentValue={data.damagePerMinuteOpponent} type="number" showBackground={true} />
                    </div>

                    <div className="mt-auto pt-2 text-lol-textMuted text-[10px] uppercase font-bold tracking-wider leading-tight">
                        Métrique reine de l'Artillerie
                    </div>
                </div>

                <div className="h-full">
                    {/* Correction Couleur : text-lol-info au lieu de win/loss */}
                    <CircularGauge 
                        label="Poids Offensif (Team %)" 
                        value={(data.teamDamagePercentage || 0) * 100} 
                        opponentValue={(data.teamDamagePercentageOpponent || 0) * 100}
                        color="text-lol-info" 
                    />
                </div>
                
                <div className="h-full">
                    {/* Correction Couleur : text-lol-info */}
                    <CircularGauge 
                        label="Efficacité Létale (KP)" 
                        value={(data.killParticipation || 0) * 100} 
                        opponentValue={(data.killParticipationOpponent || 0) * 100}
                        color="text-lol-info" 
                    />
                </div>
            </div>

            {/* LIGNE 2 : GRAPHIQUE TEMPOREL */}
            <SupportCombatChart chartData={data.timelineGraph?.damage_graph} />

            {/* LIGNE 3 : EXPERTISE MÉCANIQUE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* Carte Standard : Pression Early (Centrée) */}
                <div className="bg-surface-solid border border-border-glass rounded-md p-4 flex flex-col items-center text-center h-full">
                    <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-3">
                        Harcèlement (Phase de Lane)
                    </div>
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <span className="text-gray-100 font-bold text-3xl">{data.landSkillShotsEarlyGame}</span>
                        <StatDelta value={data.landSkillShotsEarlyGame} opponentValue={data.landSkillShotsEarlyGameOpponent} showBackground={true} />
                    </div>
                    <div className="mt-auto pt-2 text-lol-textMuted text-[10px] uppercase font-bold tracking-wider leading-tight">
                        Sorts touchés avant 14 minutes
                    </div>
                </div>

                {/* Carte Standard (Liste) : Maîtrise Balistique */}
                <div className="bg-surface-solid border border-border-glass rounded-md p-4 flex flex-col items-center h-full">
                    <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-4 text-center">
                        Maîtrise Balistique
                    </div>
                    <div className="flex flex-col gap-3 flex-1 w-full px-2">
                        <div className="flex justify-between items-center w-full">
                            <span className="text-gray-200 text-xs">Sorts touchés (Total)</span>
                            <div className="flex items-center gap-2">
                                <span className="text-lol-info font-bold">{data.skillshotsHit}</span>
                                <StatDelta value={data.skillshotsHit} opponentValue={data.skillshotsHitOpponent} showBackground={true} />
                            </div>
                        </div>
                        <div className="flex justify-between items-center w-full">
                            <span className="text-gray-200 text-xs">Sorts esquivés</span>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-100 font-bold">{data.skillshotsDodged}</span>
                                <StatDelta value={data.skillshotsDodged} opponentValue={data.skillshotsDodgedOpponent} showBackground={true} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Carte Standard : Spacing / Sécurité (Centrée) */}
                <div className="bg-surface-solid border border-border-glass rounded-md p-4 flex flex-col items-center text-center h-full">
                    <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-3">
                        Positionnement & Sécurité
                    </div>
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <span className="text-gray-100 font-bold text-3xl">{formatAxisTime(data.longestTimeSpentLiving * 1000)}</span>
                        <StatDelta value={data.longestTimeSpentLiving} opponentValue={data.longestTimeSpentLivingOpponent} type="time" showBackground={true} />
                    </div>
                    <div className="mt-auto pt-2 text-lol-textMuted text-[10px] uppercase font-bold tracking-wider leading-tight">
                        Temps maximum de survie ininterrompue
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SupportCombatView;