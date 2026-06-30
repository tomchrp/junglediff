/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/roles/jungle/JungleObjectivesView.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Vue experte affichant l'onglet "Objectifs" du Jungler.
 * Affiche la participation aux monstres épiques et l'efficacité des Smites.
 * Consomme le fragment de données `tabs_data.objectives`.
 * ============================================================================
 */

import React from 'react';

const JungleObjectivesView = ({ data }) => {
    const hasEpicSteal = data.epicSteals > 0;
    const hasPressureSmite = data.pressureSmites > 0;
    const hasHumiliationSteal = data.humiliationSteals > 0;
    const showSmitesBox = hasEpicSteal || hasPressureSmite || hasHumiliationSteal;

    return (
        <div className="animate-in fade-in zoom-in-95 duration-200">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 mt-2">
                {/* Bloc : Carapateurs */}
                {data.scuttles > 0 && (
                    <div className="bg-surface-solid border border-border-glass rounded-md p-3 text-center">
                        <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-1">Rivière (Carapateurs)</div>
                        <div className="text-gray-100 font-bold text-lg">{data.scuttles}</div>
                        <div className="text-lol-gold text-[9px] mt-1">Inclus 1er spawn : {data.initialCrabCount}</div>
                    </div>
                )}

                {/* Bloc : Efficacité des Smites (Conditionnel) */}
                {showSmitesBox && (
                    <div className="bg-surface-solid border border-yellow-500/30 rounded-md p-3 text-center">
                        <div className="text-yellow-500/80 text-[10px] uppercase font-bold tracking-wider mb-1">Efficacité Smites</div>
                        <div className="text-gray-200 text-xs mt-1 flex flex-col gap-0.5">
                            {hasEpicSteal && <span>Vols d'objectifs : <span className="font-bold text-yellow-400">{data.epicSteals}</span></span>}
                            {hasPressureSmite && <span>Smites sous pression : <span className="font-bold text-lol-info">{data.pressureSmites}</span></span>}
                            {hasHumiliationSteal && <span className="text-lol-loss font-bold text-[9px]">Humiliation (Vol sans smite) : {data.humiliationSteals}</span>}
                        </div>
                    </div>
                )}

                {/* Bloc : Dégâts aux Épiques */}
                {data.damageToEpic > 0 && (
                    <div className="bg-surface-solid border border-border-glass rounded-md p-3 text-center">
                        <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-1">Dégâts monstres épiques</div>
                        <div className="text-gray-100 font-bold text-lg">{data.damageToEpic?.toLocaleString('fr-FR')}</div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Bloc : Dragons personnels */}
                {data.dragonKills > 0 && (
                    <div className="bg-surface-solid border border-border-glass rounded-md p-3 text-center flex flex-col justify-between">
                        <div>
                            <div className="text-red-400 text-[10px] uppercase font-bold tracking-wider mb-1">Smites Dragons</div>
                            <div className="text-gray-100 font-bold text-xl">{data.dragonKills}</div>
                        </div>
                    </div>
                )}

                {/* Bloc : Barons personnels */}
                {data.baronKills > 0 && (
                    <div className="bg-surface-solid border border-border-glass rounded-md p-3 text-center flex flex-col justify-between">
                        <div>
                            <div className="text-emerald-400 text-[10px] uppercase font-bold tracking-wider mb-1">Smites Barons</div>
                            <div className="text-gray-100 font-bold text-xl">{data.baronKills}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JungleObjectivesView;