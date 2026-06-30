/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/support/SupportVisionCoverage.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Composant visuel de jauge de progression.
 * Illustre le pourcentage de temps durant lequel les balises de contrôle 
 * du joueur ont couvert la rivière ou la moitié de carte ennemie.
 * ============================================================================
 */

import React from 'react';

const SupportVisionCoverage = ({ coverageRatio }) => {
    // Sécurisation de la valeur entre 0 et 1
    const safeRatio = Math.max(0, Math.min(1, coverageRatio || 0));
    const percentage = Math.round(safeRatio * 100);

    /**
     * getBarColor
     * Détermine la couleur sémantique de la barre de progression en fonction 
     * de l'agressivité de la vision.
     * * @param {number} value - Le pourcentage de couverture (0 à 100)
     * @returns {string} La classe Tailwind de la couleur de fond
     */
    const getBarColor = (value) => {
        if (value >= 60) return 'bg-lol-win';
        if (value >= 30) return 'bg-lol-info';
        return 'bg-lol-textMuted';
    };

    return (
        <div className="glass-panel p-4 mt-4">
            <div className="flex justify-between items-end mb-2">
                <span className="text-lol-textMuted text-xs font-bold uppercase tracking-wider">
                    Pénétration de la Vision (Rivière & Jungle Ennemie)
                </span>
                <span className="text-gray-100 font-bold tabular-nums">
                    {percentage}%
                </span>
            </div>

            <div className="h-3 w-full bg-surface-solid rounded-full overflow-hidden border border-border-glass">
                <div
                    className={`h-full transition-all duration-1000 ease-out ${getBarColor(percentage)}`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>

            <div className="flex justify-between text-[10px] text-lol-textMuted mt-1 uppercase font-semibold">
                <span>Défensive</span>
                <span>Neutre</span>
                <span>Agressive</span>
            </div>
        </div>
    );
};

export default SupportVisionCoverage;