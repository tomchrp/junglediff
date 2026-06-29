/**
 * ============================================================================
 * FICHIER : frontend/src/components/chat/SpellWidget.jsx
 * PROJET  : JungleDiff
 * * DESCRIPTION :
 * Composant d'interface pur affichant les statistiques d'utilisation des sorts.
 * Exploite le Design System (Glassmorphism, tabular-nums) pour un affichage
 * dense et lisible, sans polluer le DOM avec du CSS inline.
 * ============================================================================
 */

import React from 'react';

/**
 * Affiche une grille de statistiques pour les sorts du joueur.
 * * @param {Object} props.data - Dictionnaire contenant les cles spellXCasts et summonerXCasts.
 */
const SpellWidget = ({ data }) => {
    if (!data || data.erreur) {
        return (
            <div className="glass-panel p-4 mt-2 text-lol-loss text-sm border border-lol-loss/20">
                {data?.erreur || "Donnees indisponibles."}
            </div>
        );
    }

    const spells = [
        { label: 'Sort A', value: data.spell1Casts },
        { label: 'Sort Z', value: data.spell2Casts },
        { label: 'Sort E', value: data.spell3Casts },
        { label: 'Sort R', value: data.spell4Casts },
    ];

    const summoners = [
        { label: 'Invocateur 1', value: data.summoner1Casts },
        { label: 'Invocateur 2', value: data.summoner2Casts },
    ];

    return (
        <div className="glass-panel p-4 mt-4 mb-2 flex flex-col gap-4 border border-white/5">
            <h4 className="text-white/70 text-xs uppercase tracking-wider font-semibold">Utilisation des competences</h4>

            <div className="grid grid-cols-4 gap-2">
                {spells.map((spell, idx) => (
                    <div key={idx} className="surface-elevated flex flex-col items-center justify-center p-2 rounded-md bg-white/5">
                        <span className="text-white/50 text-[10px] uppercase mb-1">{spell.label}</span>
                        <span className="text-white font-bold tabular-nums text-lg">{spell.value}</span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 pt-4 border-t border-white/5">
                {summoners.map((summ, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 rounded-md bg-white/5">
                        <span className="text-white/50 text-xs">{summ.label}</span>
                        <span className="text-lol-gold font-bold tabular-nums">{summ.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SpellWidget;