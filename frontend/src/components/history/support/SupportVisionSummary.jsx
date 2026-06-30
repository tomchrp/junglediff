/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/support/SupportVisionSummary.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Affiche les métriques absolues de vision sous forme de badges.
 * Utilise la classe tabular-nums pour assurer un alignement parfait 
 * des statistiques numériques.
 * ============================================================================
 */

import React from 'react';

const SupportVisionSummary = ({ summary }) => {
    if (!summary) return null;

    const formatNumber = (num, decimals = 2) => {
        return Number(num).toFixed(decimals);
    };

    const isAdvantageous = summary.visionScoreAdvantage > 0;
    const advantageColor = isAdvantageous ? 'text-lol-win' : 'text-lol-loss';

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="glass-panel p-3 flex flex-col items-center justify-center text-center">
                <span className="text-lol-textMuted text-xs font-bold uppercase tracking-wider mb-1">Score / Min</span>
                <span className="text-gray-100 font-bold text-lg tabular-nums">
                    {formatNumber(summary.visionScorePerMinute)}
                </span>
            </div>

            <div className="glass-panel p-3 flex flex-col items-center justify-center text-center">
                <span className="text-lol-textMuted text-xs font-bold uppercase tracking-wider mb-1">Pinks Achetées</span>
                <span className="text-gray-100 font-bold text-lg tabular-nums">
                    {summary.visionWardsBoughtInGame}
                </span>
            </div>

            <div className="glass-panel p-3 flex flex-col items-center justify-center text-center">
                <span className="text-lol-textMuted text-xs font-bold uppercase tracking-wider mb-1">Wards Détruites</span>
                <span className="text-gray-100 font-bold text-lg tabular-nums">
                    {summary.wardsKilled}
                </span>
            </div>

            <div className="glass-panel p-3 flex flex-col items-center justify-center text-center border-b-2 border-transparent" style={{ borderBottomColor: isAdvantageous ? '#2debb1' : '#ff4e50' }}>
                <span className="text-lol-textMuted text-xs font-bold uppercase tracking-wider mb-1">Diff Vis-à-vis</span>
                <span className={`${advantageColor} font-bold text-lg tabular-nums`}>
                    {isAdvantageous ? '+' : ''}{formatNumber(summary.visionScoreAdvantage)}
                </span>
            </div>
        </div>
    );
};

export default SupportVisionSummary;