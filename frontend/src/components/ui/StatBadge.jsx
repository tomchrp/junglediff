/**
 * ============================================================================
 * FICHIER : frontend/src/components/ui/StatBadge.jsx
 * DESCRIPTION :
 * Primitive visuelle pour l'affichage de données polarisées (ex: Winrate).
 * Centralise la règle métier : Vert si >= 50, Rouge sinon.
 * ============================================================================
 */
import React from 'react';

export default function StatBadge({ value, suffix = "", threshold = 50 }) {
    const isSuccess = value >= threshold;
    const colorClass = isSuccess ? 'text-lol-win' : 'text-lol-loss';

    return (
        <span className={`font-semibold ${colorClass}`}>
            {value}{suffix}
        </span>
    );
}