/**
 * ============================================================================
 * FICHIER : frontend/src/components/ui/CustomItemDot.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Primitive graphique pour Recharts. Dessine une bulle SVG contenant l'icône 
 * d'un objet (via DataDragon) sur un point de courbe spécifique.
 * Gère le zoom au survol de manière fluide grâce au transform-origin.
 * ============================================================================
 */

import React from 'react';

const CustomItemDot = (props) => {
    // AJOUT : on récupère versionDDragon injecté par Recharts
    const { cx, cy, payload, versionDDragon } = props;

    if (!payload.itemIds || payload.itemIds.length === 0) {
        return null;
    }

    const itemId = payload.itemIds[0];
    // CORRECTION : utilisation de la version dynamique (avec fallback de sécurité)
    const version = versionDDragon || "14.12.1";
    const imgUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`;

    return (
        <svg x={cx - 12} y={cy - 12} width={24} height={24} className="overflow-visible z-10">
            <g className="transition-transform duration-200 hover:scale-[1.4] cursor-pointer" style={{ transformOrigin: '12px 12px' }}>
                <image href={imgUrl} width={24} height={24} clipPath="circle(12px at center)" />
                <circle cx="12" cy="12" r="12" stroke="#eab308" strokeWidth="2" fill="none" />
            </g>
        </svg>
    );
};

export default CustomItemDot;