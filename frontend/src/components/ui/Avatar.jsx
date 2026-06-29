/**
 * ============================================================================
 * FICHIER : frontend/src/components/ui/Avatar.jsx
 * DESCRIPTION :
 * Primitive visuelle garantissant l'uniformité de toutes les images 
 * (Champions, Items, Profils) de l'application. Centralise la gestion des 
 * erreurs (fallback) et les règles d'arrondi.
 * ============================================================================
 */
import React from 'react';

export default function Avatar({ src, alt, fallbackSrc, size = "md", isSelected = false }) {
    // Le dictionnaire des tailles centralise les dimensions
    const sizeClasses = {
        sm: "w-8 h-8",
        md: "w-12 h-12",
        lg: "w-16 h-16",
        xl: "w-24 h-24"
    };

    // La règle d'arrondi et de bordure est gravée ici
    const borderClass = isSelected ? 'border-lol-gold' : 'border-border-strong';

    return (
        <img
            src={src}
            alt={alt}
            className={`${sizeClasses[size]} rounded-md border shrink-0 object-cover ${borderClass}`}
            onError={(e) => {
                if (fallbackSrc && e.target.src !== fallbackSrc) {
                    e.target.src = fallbackSrc;
                }
            }}
        />
    );
}