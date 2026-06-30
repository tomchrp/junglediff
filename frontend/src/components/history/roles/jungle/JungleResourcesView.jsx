/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/roles/jungle/JungleResourcesView.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Vue experte (Dumb Component) affichant l'onglet "Ressources" du Jungler.
 * Ne contient aucune logique mathématique. Consomme directement le fragment
 * de données `tabs_data.resources` généré par le backend.
 * Applique le Design System Dark Data-Viz.
 * ============================================================================
 */

import React from 'react';

const JungleResourcesView = ({ data }) => {
    /**
     * Composant utilitaire local pour gérer l'affichage sémantique des deltas.
     */
    const renderDelta = (deltaValue) => {
        if (deltaValue === undefined || deltaValue === null) return <span className="text-lol-textMuted font-bold ml-2 text-xs">N/A</span>;

        const formattedDelta = Math.round(deltaValue);

        if (deltaValue > 0) return <span className="text-lol-win font-bold ml-2 text-xs">+{formattedDelta}</span>;
        if (deltaValue < 0) return <span className="text-lol-loss font-bold ml-2 text-xs">{formattedDelta}</span>;
        return <span className="text-lol-textMuted font-bold ml-2 text-xs">0</span>;
    };

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2 animate-in fade-in zoom-in-95 duration-200">
            {/* Bloc 1 : CS Global */}
            <div className="bg-surface-solid border border-border-glass rounded-md p-3 text-center flex flex-col justify-center">
                <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-1">Score de Sbires (CS)</div>
                <div className="text-gray-100 font-bold text-lg">{data.totalCS}</div>
                <div className="text-lol-textMuted text-[9px] mt-2 flex flex-col gap-0.5 text-left w-max mx-auto">
                    <span>• <span className="text-gray-100">{data.laneMinions}</span> Sbires (Lane)</span>
                    <span>• <span className="text-gray-100">{data.pureJungleCamps}</span> Camps (<span className="text-lol-gold">{data.pureJungleCS} CS</span>)</span>
                    <span>• <span className="text-gray-100">{data.scuttles}</span> Carapateurs</span>
                </div>
            </div>

            {/* Bloc 2 : Contrôle de la Jungle Pure */}
            <div className="bg-surface-solid border border-border-glass rounded-md p-3 text-center flex flex-col justify-center">
                <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-1">Camps de Jungle purs</div>
                <div className="text-gray-100 font-bold text-sm mt-1">
                    {data.allyJungleCS / 4} <span className="text-lol-textMuted text-[10px]">({data.allyJungleCS} CS)</span> Alliés
                </div>
                <div className="text-lol-info font-bold text-sm mt-0.5">
                    {data.enemyJungleCS / 4} <span className="text-lol-info/70 text-[10px]">({data.enemyJungleCS} CS)</span> Ennemis
                </div>
                {data.buffsStolen > 0 && (
                    <div className="text-lol-gold text-xs font-bold mt-2 pt-2 border-t border-border-glass">
                        Buffs volés : {data.buffsStolen}
                    </div>
                )}
            </div>

            {/* Bloc 3 : Économie */}
            <div className="bg-surface-solid border border-border-glass rounded-md p-3 text-center">
                <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-1">Golds Générés</div>
                <div className="text-gray-100 font-bold text-lg">{data.goldEarned?.toLocaleString('fr-FR')}</div>
                <div className="mt-1">{renderDelta(data.goldDelta)}</div>
            </div>

            {/* Bloc 4 : Rythme Early Game */}
            <div className="bg-surface-solid border border-border-glass rounded-md p-3 text-center">
                <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-1">Rythme Avant 10m</div>
                <div className="text-gray-100 font-bold text-lg">{Math.round(data.jungleCsBefore10Minutes)} cs</div>
            </div>
        </div>
    );
};

export default JungleResourcesView;