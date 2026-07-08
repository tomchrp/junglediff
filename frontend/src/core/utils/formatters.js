/**
 * ============================================================================
 * FICHIER : frontend/src/core/utils/formatters.js
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Regroupe toutes les fonctions utilitaires liées au formatage de l'affichage
 * des données brutes (nombres, pourcentages, temps, couleurs conditionnelles).
 * Ce fichier centralise la logique de présentation textuelle pour garantir
 * une consistance visuelle stricte sur l'ensemble de l'application et purger
 * les composants React de la logique métier.
 * ============================================================================
 */

export const formatters = {
    number: (val) => (val || 0).toLocaleString(),
    number_zero_decimal: (val) => (val || 0).toFixed(0),
    number_one_decimal: (val) => (val || 0).toFixed(1),
    percentage: (val) => `${(val || 0).toFixed(0)}%`,
    time_seconds: (val) => {
        if (val === undefined || val === null) return "N/A";
        const total = Math.floor(val);
        const m = Math.floor(total / 60);
        const s = total % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    },
    time_milliseconds: (val) => {
        if (val === undefined || val === null) return "N/A";
        const total = Math.floor(val / 1000);
        const m = Math.floor(total / 60);
        const s = total % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
};

/**
 * Détermine la classe CSS de couleur textuelle en fonction du taux de victoire.
 * Cette fonction est utilisée pour colorer sémantiquement les statistiques
 * transversales de l'application (Historique, Synergies).
 * * @param {number} wr - Le winrate à évaluer (sur 100).
 * @returns {string} La classe Tailwind correspondante (victoire ou défaite).
 */
export const getWinrateColorClass = (wr) => {
    return wr >= 50 ? 'text-lol-win' : 'text-lol-loss';
};