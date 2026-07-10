/**
 * ============================================================================
 * FICHIER : frontend/src/components/ui/StatBadge.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Primitive visuelle (UI Kit) pour l'affichage de compteurs ou d'indicateurs 
 * (Niveau, VS, Stacks) superposés à des éléments graphiques.
 * * MODIFICATIONS :
 * - Ajout de la propriété `positionClass` pour permettre l'ancrage dynamique 
 * par le parent (ex: bas-droite pour le VS, centre-bas par défaut).
 * ============================================================================
 */
import React from 'react';

/**
 * Affiche un badge de statistiques superposé.
 * * @param {string} positionClass - Classes utilitaires Tailwind pour le positionnement absolu.
 * @param {string} colorClass - Classe de couleur du texte (jetons sémantiques text-lol-*).
 */
const StatBadge = ({
    children,
    colorClass = "text-lol-textMuted",
    positionClass = "-bottom-2 left-1/2 -translate-x-1/2",
    className = ""
}) => {
    return (
        <div className={`absolute ${positionClass} min-w-[20px] h-4 px-1.5 bg-surface-solid border border-border-strong rounded-md flex items-center justify-center text-[10px] font-bold shadow-sm z-10 ${colorClass} ${className}`}>
            {children}
        </div>
    );
};

export default StatBadge;