/**
 * ============================================================================
 * FICHIER : frontend/src/components/ui/StatCard.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Composant générique du System Design pour l'affichage d'une carte de statistique.
 * Encapsule la logique de disposition Flexbox pour garantir un alignement 
 * vertical parfait entre plusieurs cartes d'une même grille, indépendamment 
 * de la présence ou non d'un contenu supplémentaire en pied de carte.
 * ============================================================================
 */

import React from 'react';

const StatCard = ({ title, children, footer }) => {
    /**
     * Rend la carte avec une distribution architecturée stricte.
     * Flex-col avec h-full force la carte à prendre la hauteur de la grille.
     * La div centrale avec flex-1 absorbe l'espace vide, poussant le titre
     * en haut et le footer (si existant) tout en bas.
     * 
     * @returns {JSX.Element} La carte formatée.
     */
    return (
        <div className="bg-surface-solid border border-border-glass rounded-md p-4 flex flex-col h-full">
            {/* Zone fixe : Titre */}
            <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-4 text-center">
                {title}
            </div>

            {/* Zone flexible : Contenu principal (Jauges, Valeurs, Listes) */}
            <div className="flex-1 flex flex-col items-center justify-center w-full">
                {children}
            </div>

            {/* Zone fixe optionnelle : Pied de page (Ratios, Sous-stats) */}
            {footer && (
                <div className="mt-auto pt-4 flex flex-col items-center justify-center w-full">
                    {footer}
                </div>
            )}
        </div>
    );
};

export default StatCard;