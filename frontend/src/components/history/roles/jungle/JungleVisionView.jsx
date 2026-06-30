/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/roles/jungle/JungleVisionView.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Vue experte affichant l'onglet "Vision" du Jungler.
 * Consomme le fragment de données `tabs_data.vision`.
 * ============================================================================
 */

import React from 'react';

const JungleVisionView = ({ data }) => {
    const showWardsBox = data.pinkWards > 0 || data.detectorWards > 0 || data.stealthWards > 0;

    const renderDelta = (deltaValue) => {
        if (deltaValue === undefined || deltaValue === null) return <span className="text-lol-textMuted font-bold ml-2 text-xs">N/A</span>;
        const formattedDelta = Math.round(deltaValue);
        if (deltaValue > 0) return <span className="text-lol-win font-bold ml-2 text-xs">+{formattedDelta}</span>;
        if (deltaValue < 0) return <span className="text-lol-loss font-bold ml-2 text-xs">{formattedDelta}</span>;
        return <span className="text-lol-textMuted font-bold ml-2 text-xs">0</span>;
    };

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-surface-solid border border-border-glass rounded-md p-3 text-center">
                <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-1">Score de Vision</div>
                <div className="text-gray-100 font-bold text-lg">{data.visionScore}</div>
                <div className="mt-1">{renderDelta(data.visionScoreDelta)}</div>
            </div>

            <div className="bg-surface-solid border border-border-glass rounded-md p-3 text-center">
                <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-1">Delta de Vision</div>
                <div className="text-gray-100 font-bold text-lg">
                    {data.visionScoreAdvantage > 0 ? <span className="text-lol-win">+{data.visionScoreAdvantage.toFixed(1)}</span> : <span className="text-lol-loss">{data.visionScoreAdvantage?.toFixed(1) || 0}</span>}
                </div>
                <div className="text-lol-textMuted text-[9px] mt-1">Ratio : {data.visionPerMinute?.toFixed(1) || 0} / minute</div>
            </div>

            {showWardsBox && (
                <div className="bg-surface-solid border border-border-glass rounded-md p-3 text-center">
                    <div className="text-pink-400/80 text-[10px] uppercase font-bold tracking-wider mb-1">Wards Posées</div>
                    <div className="text-gray-200 text-xs mt-1 flex flex-col gap-0.5">
                        {data.pinkWards > 0 && <span>Pink Wards (Shop) : <span className="font-bold text-pink-400">{data.pinkWards}</span></span>}
                        {data.detectorWards > 0 && <span>Balises Contrôle : <span className="font-bold">{data.detectorWards}</span></span>}
                        {data.stealthWards > 0 && <span>Balises Invisibles : <span className="font-bold">{data.stealthWards}</span></span>}
                    </div>
                </div>
            )}

            <div className="bg-surface-solid border border-border-glass rounded-md p-3 text-center">
                <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-1">Wards Détruites</div>
                <div className="text-gray-100 font-bold text-lg">{data.wardsKilled}</div>
                <div className="text-lol-textMuted text-[9px] mt-1">Dont {data.wardsKilledBefore20} avant 20m</div>
            </div>
        </div>
    );
};

export default JungleVisionView;