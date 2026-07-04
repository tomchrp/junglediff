/**
 * ============================================================================
 * FICHIER : frontend/src/components/ViewSelector.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Composant de navigation principale permettant de basculer entre les
 * différentes vues de l'application (Historique, Synergies, Assistant IA,
 * et Analyse Globale du Big Data).
 * ============================================================================
 */
import React from 'react';

export default function ViewSelector({ currentView, onViewChange }) {

    /**
     * Applique les classes CSS conditionnelles selon la vue active, en
     * respectant strictement les jetons du Design System.
     */
    const getButtonClass = (viewName) => {
        const baseClass = "px-4 py-2 rounded-md font-bold text-sm tracking-wider uppercase transition-all whitespace-nowrap";
        const activeClass = "bg-lol-gold text-app shadow-glow-gold";
        const inactiveClass = "text-lol-textMuted hover:text-gray-100 hover:bg-surface-elevated";

        return `${baseClass} ${currentView === viewName ? activeClass : inactiveClass}`;
    };

    return (
        <div className="glass-panel p-2 flex gap-2 shrink-0 overflow-x-auto custom-scrollbar">
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
            <button
                className={getButtonClass('ASSISTANT_IA')}
                onClick={() => onViewChange('ASSISTANT_IA')}
            >
                Assistant IA
            </button>
            {/* NOUVEL ONGLET : ANALYSE GLOBALE */}
            <button
                className={getButtonClass('ANALYSE_GLOBALE')}
                onClick={() => onViewChange('ANALYSE_GLOBALE')}
            >
                Analyse Globale (Big Data)
            </button>
        </div>
    );
}