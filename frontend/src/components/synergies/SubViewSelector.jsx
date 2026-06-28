/**
 * ============================================================================
 * FICHIER : frontend/src/components/synergies/SubViewSelector.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Sous-menu permettant de basculer entre l'analyse des alliés (Synergies)
 * et l'analyse des adversaires (Matchups).
 * * DESIGN SYSTEM : Utilisation des jetons neutres (border-strong, textMuted)
 * pour l'état inactif, afin de mettre en valeur l'état actif (lol-gold).
 * ============================================================================
 */
import React from 'react';

export default function SubViewSelector({ activeView, onViewChange }) {
    const getButtonClass = (viewName) => {
        const baseClass = "px-6 py-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2";
        const isActive = activeView === viewName;
        // Le bouton inactif s'efface visuellement au profit du jeton textMuted
        return `${baseClass} ${isActive ? "border-lol-gold text-lol-gold" : "border-transparent text-lol-textMuted hover:text-gray-100"}`;
    };

    return (
        <div className="flex justify-center border-b border-border-strong mb-6">
            <button
                className={getButtonClass('SYNERGIES')}
                onClick={() => onViewChange('SYNERGIES')}
            >
                Synergies (Alliés)
            </button>
            <button
                className={getButtonClass('MATCHUPS')}
                onClick={() => onViewChange('MATCHUPS')}
            >
                Matchups (Adversaires)
            </button>
        </div>
    );
}