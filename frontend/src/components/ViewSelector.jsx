/**
 * ============================================================================
 * FICHIER : frontend/src/components/ViewSelector.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Composant de navigation principale permettant de basculer entre les
 * différentes vues de l'application (Historique, Synergies, Assistant IA,
 * Analyse Globale du Big Data, Meta Duos et Premier Clear).
 * 
 * MODIFICATIONS :
 * - Ajout du bouton d'accès à l'état META_DUOS.
 * - Ajout du bouton d'accès à l'état PREMIER_CLEAR pour l'analyse du pathing.
 * ============================================================================
 */
import React from 'react';

export default function ViewSelector({ currentView, onViewChange }) {

    /**
     * getButtonClass
     * 
     * DESCRIPTION :
     * Détermine les classes utilitaires Tailwind à appliquer sur un onglet
     * en fonction de son état d'activation, garantissant la cohérence avec
     * le Design System (text-lol-gold pour l'état actif).
     * 
     * @param {string} viewName - L'identifiant de la vue (ex: 'META_DUOS')
     * @returns {string} La chaîne de classes CSS complète
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
            <button
                className={getButtonClass('ANALYSE_GLOBALE')}
                onClick={() => onViewChange('ANALYSE_GLOBALE')}
            >
                Analyse Globale (Big Data)
            </button>
            <button
                className={getButtonClass('META_DUOS')}
                onClick={() => onViewChange('META_DUOS')}
            >
                Meta Duos
            </button>
            {/* NOUVEL ONGLET : PREMIER CLEAR */}
            <button
                className={getButtonClass('PREMIER_CLEAR')}
                onClick={() => onViewChange('PREMIER_CLEAR')}
            >
                Premier Clear
            </button>
        </div>
    );
}