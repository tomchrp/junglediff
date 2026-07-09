/**
 * ============================================================================
 * FICHIER : frontend/src/components/ViewSelector.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Composant de navigation principale permettant de basculer entre les
 * différentes vues de l'application.
 * * MODIFICATIONS RECENTES :
 * - Remplacement des couleurs solides par le système Glassmorphism : 
 * Conteneur vitré (`glass-panel`), onglet actif creusé (`bg-black/30`), 
 * onglets inactifs réactifs au survol (`hover:bg-white/5`).
 * ============================================================================
 */
import React from 'react';

export default function ViewSelector({ currentView, onViewChange }) {

    /**
     * getButtonClass
     * * DESCRIPTION :
     * Détermine les classes utilitaires Tailwind à appliquer sur un onglet.
     * * @param {string} viewName - L'identifiant de la vue (ex: 'META_DUOS')
     * @returns {string} La chaîne de classes CSS complète
     */
    const getButtonClass = (viewName) => {
        const baseClass = "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all duration-200";
        // État actif : Aspect enfoncé dans la vitre
        const activeClass = "bg-black/30 shadow-inner border border-border-glass/50 text-lol-gold";
        // État inactif : Plat avec illumination au survol
        const inactiveClass = "text-lol-textMuted hover:bg-white/5 hover:text-gray-200 border border-transparent";

        return `${baseClass} ${currentView === viewName ? activeClass : inactiveClass}`;
    };

    return (
        <div className="glass-panel p-1.5 flex gap-1 shrink-0 overflow-x-auto custom-scrollbar z-20 relative">
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
            <button
                className={getButtonClass('PREMIER_CLEAR')}
                onClick={() => onViewChange('PREMIER_CLEAR')}
            >
                Premier Clear
            </button>
        </div>
    );
}