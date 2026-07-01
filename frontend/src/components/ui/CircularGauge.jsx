/**
 * ============================================================================
 * FICHIER : frontend/src/components/ui/CircularGauge.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Composant central du Design System pour l'affichage des proportions.
 * Jauge SVG semi-circulaire animée.
 * ============================================================================
 */

import React from 'react';
import StatDelta from './StatDelta.jsx';

/**
 * @param {Object} props
 * @param {number} props.value - La valeur du joueur.
 * @param {number} props.opponentValue - La valeur de l'adversaire.
 * @param {number} [props.max=100] - Valeur maximale.
 * @param {string} props.label - Titre de la jauge.
 * @param {string} props.color - Couleur Tailwind (ex: 'text-lol-info').
 * @param {string} [props.suffix='%'] - Suffixe (ex: '%').
 */
const CircularGauge = ({ value, opponentValue, max = 100, label, color, suffix = '%' }) => {
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const safeValue = isNaN(value) ? 0 : Math.max(0, value);

    const percentage = Math.min(100, (safeValue / max) * 100);
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="bg-surface-solid border border-border-glass rounded-md p-3 flex flex-col items-center h-full">
            <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-2 text-center">
                {label}
            </div>

            <div className="relative w-20 h-20 flex items-center justify-center mb-3">
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-app/50" />
                    <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className={`transition-all duration-1000 ease-out ${color}`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-gray-100 font-bold text-sm">
                        {safeValue.toFixed(0)}{suffix}
                    </span>
                </div>
            </div>

            {/* Delta systématisé avec fond pour correspondre aux autres cartes */}
            <div className="mt-auto">
                <StatDelta
                    value={value}
                    opponentValue={opponentValue}
                    type="percentage"
                    polarity="positive"
                    showBackground={true}
                />
            </div>
        </div>
    );
};

export default CircularGauge;