/**
 * ============================================================================
 * FICHIER : frontend/src/components/ui/Avatar.jsx
 * DESCRIPTION :
 * Primitive visuelle universelle du Design System.
 * Gère toutes les images de l'application (Champions, Items, Sorts, Runes)
 * pour garantir une harmonie totale (bordures, arrondis, fonds).
 * ============================================================================
 */
import React from 'react';

export default function Avatar({
    src,
    alt = "Image",
    type = "champion", // Valeurs possibles : "champion", "item", "spell", "rune", "lane"
    size = "md",       // Valeurs possibles : "xs" (20px), "sm" (28px), "base" (40px), "md" (48px)
    isSelected = false,
    className = "",
    fallbackSrc = "https://ddragon.leagueoflegends.com/cdn/14.12.1/img/profileicon/29.png"
}) {
    // 1. Dictionnaire strict des dimensions
    const sizeClasses = {
        xs: "w-5 h-5",
        sm: "w-7 h-7",
        base: "w-10 h-10",
        md: "w-12 h-12",
        lg: "w-16 h-16",
        xl: "w-24 h-24"
    };

    // 2. Forme standardisée (Harmonisation globale sur le petit arrondi rounded-md)
    const shapeClass = type === 'lane' ? 'rounded-full' : 'rounded-md';

    // 3. Bordures et focus
    const borderClass = isSelected
        ? 'border-lol-gold shadow-[0_0_4px_rgba(201,170,113,0.8)] z-10'
        : 'border-border-strong';

    // 4. Fond standard neutralisé pour les icônes transparentes (Runes, Lanes)
    const bgClass = 'bg-surface-solid';

    // Assemblage du Wrapper (C'est lui qui délimite la forme et cache le débordement)
    const wrapperClasses = `relative shrink-0 flex items-center justify-center overflow-hidden border ${shapeClass} ${sizeClasses[size]} ${borderClass} ${bgClass} ${className}`;

    // ----------------------------------------------------------------------
    // ASTUCE "ANTI-BORDURE NOIRE" RIOT GAMES :
    // On scale l'image des champions à 115% pour rogner la bordure du PNG 
    // d'origine, l'overflow-hidden du wrapper s'occupe de couper proprement.
    // ----------------------------------------------------------------------
    const imgScale = type === 'champion' ? 'scale-[1.15]' : 'scale-100';

    // Léger padding pour éviter que les icônes transparentes ne touchent les bords
    const imgPadding = (type === 'rune' || type === 'lane') ? 'p-0.5' : '';
    const imgOpacity = type === 'lane' ? 'opacity-90' : 'opacity-100';

    const objectFit = (type === 'rune' || type === 'lane' || type === 'spell') ? 'object-contain' : 'object-cover';

    if (!src) {
        return <div className={wrapperClasses}></div>;
    }

    return (
        <div className={wrapperClasses}>
            <img
                src={src}
                alt={alt}
                className={`w-full h-full ${objectFit} ${imgScale} ${imgPadding} ${imgOpacity}`}
                onError={(e) => {
                    if (e.target.src !== fallbackSrc) {
                        e.target.src = fallbackSrc;
                    }
                }}
            />
        </div>
    );
}