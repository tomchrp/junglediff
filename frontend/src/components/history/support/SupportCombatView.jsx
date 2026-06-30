/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/support/SupportCombatView.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Vue d'analyse des combats pour le rôle de Support.
 * Sépare strictement les indicateurs agnostiques (valables pour tous les supports)
 * des indicateurs spécifiques dépendants de l'archétype du champion joué.
 * Intègre le rendu conditionnel pour éviter la surcharge cognitive.
 * ============================================================================
 */

import React from 'react';

const SupportCombatView = ({ combatData, archetype }) => {
    if (!combatData) return null;

    const formatPercent = (val) => Math.round((val || 0) * 100) + '%';
    const formatNumber = (val) => Number(val).toLocaleString('fr-FR');

    // Évaluation des conditions dynamiques
    const isImmortal = combatData.deaths === 0;
    const isPacifist = combatData.kills === 0 && combatData.assists >= 15;
    const isHeroicSacrifice = combatData.deaths > 7 && combatData.killParticipation > 0.65;
    const isInvader = combatData.takedownsBeforeJungleMinionSpawn > 0;
    const isHiddenCarry = combatData.totalDamageDealtToChampions > combatData.adcTotalDamageDealtToChampions && combatData.adcTotalDamageDealtToChampions > 0;

    return (
        <div className="flex flex-col gap-4 w-full">
            {/* Section Agnostique */}
            <div className="glass-panel p-3">
                <h5 className="text-lol-textMuted font-bold uppercase tracking-wider text-xs mb-3 border-b border-border-strong pb-1">
                    Fondations du Rôle
                </h5>
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col items-center justify-center text-center">
                        <span className="text-lol-textMuted text-[10px] font-bold uppercase tracking-wider mb-1">Kill Participation</span>
                        <span className="text-gray-100 font-bold text-lg tabular-nums">{formatPercent(combatData.killParticipation)}</span>
                    </div>
                    {isImmortal ? (
                        <div className="flex flex-col items-center justify-center text-center bg-lol-win/10 rounded border border-lol-win/30">
                            <span className="text-lol-win text-[10px] font-bold uppercase tracking-wider mb-1">Immortel</span>
                            <span className="text-lol-win font-bold text-lg tabular-nums">0 Mort</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center">
                            <span className="text-lol-textMuted text-[10px] font-bold uppercase tracking-wider mb-1">Morts</span>
                            <span className="text-gray-100 font-bold text-lg tabular-nums">{combatData.deaths}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Section Spécifique à l'Archétype */}
            <div className="glass-panel p-3">
                <h5 className="text-lol-gold font-bold uppercase tracking-wider text-xs mb-3 border-b border-border-strong pb-1">
                    Performance : {archetype}
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    {/* ENCHANTER */}
                    {archetype === 'ENCHANTER' && (
                        <>
                            <div className="flex flex-col items-center justify-center text-center p-2 bg-surface-solid rounded">
                                <span className="text-lol-textMuted text-[10px] font-bold uppercase tracking-wider mb-1">Dégâts Absorbés (Boucliers)</span>
                                <span className="text-gray-100 font-bold text-md tabular-nums">{formatNumber(combatData.totalDamageShieldedOnTeammates)}</span>
                            </div>
                            {isPacifist && (
                                <div className="flex flex-col items-center justify-center text-center p-2 bg-lol-info/10 rounded border border-lol-info/30">
                                    <span className="text-lol-info text-[10px] font-bold uppercase tracking-wider mb-1">Ange Gardien</span>
                                    <span className="text-lol-info font-bold text-xs">0 Kill volé, {combatData.assists} Assists</span>
                                </div>
                            )}
                        </>
                    )}

                    {/* VANGUARD */}
                    {archetype === 'VANGUARD' && (
                        <>
                            <div className="flex flex-col items-center justify-center text-center p-2 bg-surface-solid rounded">
                                <span className="text-lol-textMuted text-[10px] font-bold uppercase tracking-wider mb-1">Verrouillage (CC)</span>
                                <span className="text-gray-100 font-bold text-md tabular-nums">{combatData.timeCCingOthers}s</span>
                            </div>
                            {isHeroicSacrifice && (
                                <div className="flex flex-col items-center justify-center text-center p-2 bg-lol-gold/10 rounded border border-lol-gold/30">
                                    <span className="text-lol-gold text-[10px] font-bold uppercase tracking-wider mb-1">Sacrifice Rentable</span>
                                    <span className="text-lol-gold font-bold text-xs">Mort pour l'équipe (KP massif)</span>
                                </div>
                            )}
                        </>
                    )}

                    {/* CATCHER */}
                    {archetype === 'CATCHER' && (
                        <>
                            <div className="flex flex-col items-center justify-center text-center p-2 bg-surface-solid rounded">
                                <span className="text-lol-textMuted text-[10px] font-bold uppercase tracking-wider mb-1">Entrave Ennemie</span>
                                <span className="text-gray-100 font-bold text-md tabular-nums">{formatNumber(combatData.timeEnemySpentControlled)}</span>
                            </div>
                            {isInvader && (
                                <div className="flex flex-col items-center justify-center text-center p-2 bg-lol-loss/10 rounded border border-lol-loss/30">
                                    <span className="text-lol-loss text-[10px] font-bold uppercase tracking-wider mb-1">Roi de l'Invade</span>
                                    <span className="text-lol-loss font-bold text-xs">Pression avant l'apparition des sbires</span>
                                </div>
                            )}
                        </>
                    )}

                    {/* ARTILLERY */}
                    {archetype === 'ARTILLERY' && (
                        <>
                            <div className="flex flex-col items-center justify-center text-center p-2 bg-surface-solid rounded">
                                <span className="text-lol-textMuted text-[10px] font-bold uppercase tracking-wider mb-1">Pression Brute (Part des dégâts)</span>
                                <span className="text-gray-100 font-bold text-md tabular-nums">{formatPercent(combatData.teamDamagePercentage)}</span>
                            </div>
                            {isHiddenCarry && (
                                <div className="flex flex-col items-center justify-center text-center p-2 bg-lol-win/10 rounded border border-lol-win/30">
                                    <span className="text-lol-win text-[10px] font-bold uppercase tracking-wider mb-1">Carry Caché</span>
                                    <span className="text-lol-win font-bold text-xs">A infligé plus de dégâts que l'ADC</span>
                                </div>
                            )}
                        </>
                    )}

                    {/* Fallback si l'archétype est manquant ou non géré */}
                    {!['ENCHANTER', 'VANGUARD', 'CATCHER', 'ARTILLERY'].includes(archetype) && (
                        <div className="col-span-full text-center text-lol-textMuted text-xs p-2">
                            Aucune statistique de combat spécifique trouvée pour l'archétype {archetype}.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SupportCombatView;