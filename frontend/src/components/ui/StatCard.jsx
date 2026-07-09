/**
 * ============================================================================
 * FICHIER : frontend/src/components/ui/StatCard.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Composant de présentation générique pour un indicateur de performance (KPI).
 * Utilisé à divers endroits de l'application (Sidebar, Détails de match).
 * 
 * MODIFICATIONS RECENTES (Refonte UI) :
 * - Refonte esthétique pour le "Nested Glassmorphism" : les cartes adoptent 
 *   un fond sombre (bg-black/20) avec une bordure vitrée très fine pour 
 *   se démarquer du panneau parent sans l'alourdir visuellement.
 * - Fort contraste typographique entre la valeur brute et le label.
 * ============================================================================
 */

import React from 'react';

/**
 * Affiche une métrique formatée avec son label et un éventuel icône.
 * @param {string} title - Le titre ou label de la métrique (ex: "Dégâts").
 * @param {string|number} value - La valeur principale à mettre en évidence.
 * @param {string} subtitle - Information secondaire optionnelle sous la valeur.
 * @param {React.ReactNode} icon - Icône contextuel optionnel.
 * @param {boolean} highlight - Si vrai, applique la couleur dorée à la valeur.
 * @param {string} className - Classes CSS additionnelles pour surcharger le style.
 */
const StatCard = ({ title, value, subtitle, icon, highlight, className = '' }) => {
    return (
        <div className={`bg-black/20 rounded-lg p-3 border border-border-glass flex flex-col justify-center relative overflow-hidden ${className}`}>
            <div className="flex justify-between items-start mb-1">
                <span className="text-lol-textMuted text-[10px] uppercase tracking-wider font-bold z-10">
                    {title}
                </span>
                {icon && <span className="text-gray-400 z-10">{icon}</span>}
            </div>

            <div className="flex items-baseline gap-2 z-10">
                <span className={`text-xl font-bold drop-shadow-sm ${highlight ? 'text-lol-gold' : 'text-gray-100'}`}>
                    {value}
                </span>
                {subtitle && (
                    <span className="text-lol-textMuted text-xs font-medium">
                        {subtitle}
                    </span>
                )}
            </div>
        </div>
    );
};

export default StatCard;