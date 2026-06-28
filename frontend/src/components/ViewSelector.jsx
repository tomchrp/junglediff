/**
 * ============================================================================
 * FICHIER : frontend/src/components/ViewSelector.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Composant de navigation principale permettant de basculer entre les
 * différentes vues de l'application (Historique, Synergies & Matchups).
 * * DESIGN SYSTEM : Le conteneur est uniformisé en glass-panel. Le bouton
 * actif adopte un contraste maximal et une ombre dorée, tandis que les 
 * boutons inactifs restent en retrait via le jeton textMuted.
 * ============================================================================
 */
import React from 'react';

export default function ViewSelector({ currentView, onViewChange }) {

    /**
     * Applique les classes CSS conditionnelles selon la vue active, en
     * respectant strictement les jetons du Design System.
     * 
     * @param {string} viewName - L'identifiant de la vue ('HISTORIQUE' ou 'SYNERGIES').
     * @returns {string} La chaîne de classes Tailwind compilée.
     */
    const getButtonClass = (viewName) => {
        const baseClass = "px-4 py-2 rounded-md font-bold text-sm tracking-wider uppercase transition-all";
        const activeClass = "bg-lol-gold text-app shadow-glow-gold";
        const inactiveClass = "text-lol-textMuted hover:text-gray-100 hover:bg-surface-elevated";

        return `${baseClass} ${currentView === viewName ? activeClass : inactiveClass}`;
    };

    return (
        <div className="glass-panel p-2 flex gap-2 shrink-0">
            <button
                className={getButtonClass('HISTORIQUE')}
                onClick={() => onViewChange('HISTORIQUE')}
            >
                Historique
            </button>
            <button
                className={getButtonClass('SYNERGIES')}
                onClick={() => onViewChange('SYNERGIES')}
            >
                Synergies & Matchups
            </button>
        </div>
    );
}