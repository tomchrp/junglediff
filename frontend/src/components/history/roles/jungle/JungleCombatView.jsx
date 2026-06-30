/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/roles/jungle/JungleCombatView.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Vue experte affichant l'onglet "Combat" du Jungler.
 * Consomme le fragment de données `tabs_data.combat`.
 * ============================================================================
 */

import React from 'react';

const JungleCombatView = ({ data }) => {
    const renderDelta = (deltaValue, isPercentage = false) => {
        if (deltaValue === undefined || deltaValue === null) return <span className="text-lol-textMuted font-bold ml-2 text-xs">N/A</span>;
        const formattedDelta = isPercentage ? deltaValue.toFixed(1) : Math.round(deltaValue);
        const suffix = isPercentage ? '%' : '';
        if (deltaValue > 0) return <span className="text-lol-win font-bold ml-2 text-xs">+{formattedDelta}{suffix}</span>;
        if (deltaValue < 0) return <span className="text-lol-loss font-bold ml-2 text-xs">{formattedDelta}{suffix}</span>;
        return <span className="text-lol-textMuted font-bold ml-2 text-xs">0{suffix}</span>;
    };

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-surface-solid border border-border-glass rounded-md p-3 text-center">
                <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-1">Dégâts aux Champions</div>
                <div className="text-gray-100 font-bold text-lg">{data.damageToChampions?.toLocaleString('fr-FR')}</div>
                <div className="mt-1">{renderDelta(data.damageDelta)}</div>
            </div>

            <div className="bg-surface-solid border border-border-glass rounded-md p-3 text-center">
                <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-1">Participation (KP)</div>
                <div className="text-gray-100 font-bold text-lg">{((data.killParticipation || 0) * 100).toFixed(0)}%</div>
                <div className="mt-1">{renderDelta((data.kpDelta || 0) * 100, true)}</div>
            </div>

            {data.earlyGanks > 0 && (
                <div className="bg-surface-solid border border-lol-gold/40 rounded-md p-3 text-center">
                    <div className="text-lol-gold/80 text-[10px] uppercase font-bold tracking-wider mb-1">Ganks Réussis (&lt;10m)</div>
                    <div className="text-gray-100 font-bold text-lg">{data.earlyGanks}</div>
                </div>
            )}

            <div className="bg-surface-solid border border-border-glass rounded-md p-3 text-center">
                <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-1">Utilité au Combat</div>
                <div className="text-gray-200 text-xs mt-1">Temps CC : <span className="font-bold">{data.ccTime}s</span></div>
                <div className="text-gray-200 text-xs mt-0.5">Kills sur contestation : <span className="font-bold">{data.contestedKills}</span></div>
            </div>
        </div>
    );
};

export default JungleCombatView;