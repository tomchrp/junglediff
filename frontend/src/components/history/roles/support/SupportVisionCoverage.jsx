/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/roles/support/SupportVisionCoverage.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Composant affichant les jauges circulaires de la catégorie Vision.
 * Intègre désormais le composant StatDelta pour systématiser la comparaison
 * directement sous la jauge.
 * ============================================================================
 */

import React from 'react';
import StatDelta from '../../../ui/StatDelta.jsx';

/**
 * Composant utilitaire local pour dessiner une jauge circulaire.
 * * @param {Object} props
 * @param {number} props.value - La valeur du joueur.
 * @param {number} props.opponentValue - La valeur de l'adversaire (pour le delta).
 * @param {string} props.label - Le titre de la jauge.
 * @param {string} props.color - La classe CSS pour la couleur.
 */
const CircularGauge = ({ value, opponentValue, max = 100, label, color, suffix = '%' }) => {
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const safeValue = isNaN(value) ? 0 : Math.max(0, value);
    const percentage = Math.min(100, (safeValue / max) * 100);
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="bg-surface-solid border border-border-glass rounded-md p-3 flex flex-col items-center justify-center h-full">
            <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-2 text-center h-6 flex items-center">
                {label}
            </div>
            <div className="relative w-20 h-20 flex items-center justify-center mb-2">
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
            {/* Intégration systématisée de la comparaison */}
            <StatDelta value={value} opponentValue={opponentValue} type="percentage" />
        </div>
    );
};

const SupportVisionCoverage = ({ data }) => {
    return (
        <div className="grid grid-cols-2 gap-4 h-full">
            <CircularGauge
                label="Part de l'équipe"
                value={(data.teamVisionShare || 0) * 100}
                opponentValue={(data.teamVisionShareOpponent || 0) * 100} // Nécessitera une maj backend pour être hydraté
                color="text-lol-info"
            />
            <CircularGauge
                label="Pénétration Offensive"
                value={(data.controlWardCoverage || 0) * 100}
                opponentValue={(data.controlWardCoverageOpponent || 0) * 100} // Nécessitera une maj backend pour être hydraté
                color="text-emerald-500"
            />
        </div>
    );
};

export default SupportVisionCoverage;