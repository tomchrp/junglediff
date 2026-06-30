/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/roles/support/SupportCombatView.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Vue experte affichant l'onglet "Combat" du Support.
 * Affiche des métriques conditionnelles en fonction de l'archétype du champion
 * (ex: les soins pour un Enchanteur). Consomme `tabs_data.combat`.
 * ============================================================================
 */

import React from 'react';

const SupportCombatView = ({ data, archetype }) => {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-surface-solid border border-border-glass rounded-md p-3 text-center">
                <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-1">Participation (KP)</div>
                <div className="text-gray-100 font-bold text-lg">{((data.killParticipation || 0) * 100).toFixed(0)}%</div>
                <div className="text-lol-textMuted text-[9px] mt-1">K/D/A : {data.kills}/{data.deaths}/{data.assists}</div>
            </div>

            <div className="bg-surface-solid border border-border-glass rounded-md p-3 text-center">
                <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-1">Contrôle de Foule</div>
                <div className="text-gray-100 font-bold text-lg">{data.ccTime}s</div>
            </div>

            {/* Affichage conditionnel selon l'archétype poussé par le backend */}
            {(archetype === 'ENCHANTER' || archetype === 'WARDEN') && (
                <div className="bg-surface-solid border border-emerald-500/30 rounded-md p-3 text-center">
                    <div className="text-emerald-500/80 text-[10px] uppercase font-bold tracking-wider mb-1">Protection (Soins/Boucliers)</div>
                    <div className="text-gray-200 text-xs mt-1 flex flex-col gap-0.5">
                        <span>Boucliers : <span className="font-bold">{data.damageShielded?.toLocaleString('fr-FR')}</span></span>
                        <span>Soins : <span className="font-bold text-emerald-400">{data.heals?.toLocaleString('fr-FR')}</span></span>
                    </div>
                </div>
            )}

            {(archetype === 'MAGE' || archetype === 'ARTILLERY') && (
                <div className="bg-surface-solid border border-lol-info/30 rounded-md p-3 text-center">
                    <div className="text-lol-info/80 text-[10px] uppercase font-bold tracking-wider mb-1">Dégâts aux Champions</div>
                    <div className="text-gray-100 font-bold text-lg">{data.damageToChampions?.toLocaleString('fr-FR')}</div>
                </div>
            )}
        </div>
    );
};

export default SupportCombatView;