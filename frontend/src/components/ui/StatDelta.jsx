/**
 * ============================================================================
 * FICHIER : frontend/src/components/ui/StatDelta.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Composant central du Design System pour l'affichage systématisé des 
 * comparaisons (Deltas). 
 * * FONCTIONNEMENT :
 * - Gère la polarité : si polarity="negative" (ex: temps d'aveuglement), 
 * un delta négatif sera affiché en vert (victoire).
 * - Gère le typage : formate automatiquement en ms (temps), % ou nombre brut.
 * ============================================================================
 */

import React from 'react';

const StatDelta = ({ value, opponentValue, type = 'number', polarity = 'positive', showBackground = false }) => {
    // 1. Validation des données
    if (value === undefined || value === null || opponentValue === undefined || opponentValue === null) {
        return <span className="text-lol-textMuted text-[10px] font-bold">N/A</span>;
    }

    const diff = value - opponentValue;

    if (diff === 0) {
        return <span className="text-lol-textMuted text-[10px] font-bold bg-surface-solid px-1.5 py-0.5 rounded border border-border-glass">Égalité</span>;
    }

    // 2. Détermination de la victoire sémantique
    const isWin = polarity === 'positive' ? diff > 0 : diff < 0;

    // 3. Application des styles Tailwind stricts
    const colorClass = isWin ? 'text-lol-win' : 'text-lol-loss';
    const bgClass = showBackground ? (isWin ? 'bg-lol-win/10 border-lol-win/20' : 'bg-lol-loss/10 border-lol-loss/20') : 'border-transparent';

    // 4. Formatage de la valeur absolue
    const absDiff = Math.abs(diff);
    let formattedDiff = '';

    if (type === 'percentage') {
        formattedDiff = `${absDiff.toFixed(1)}%`;
    } else if (type === 'time') {
        const totalSeconds = Math.floor(absDiff / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        formattedDiff = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
        formattedDiff = Number.isInteger(absDiff) ? absDiff.toString() : absDiff.toFixed(1);
    }

    const sign = diff > 0 ? '+' : '-';

    return (
        <span className={`inline-flex items-center justify-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded border ${colorClass} ${bgClass}`}>
            <span>{sign}{formattedDiff}</span>
        </span>
    );
};

export default StatDelta;