/**
 * ============================================================================
 * FICHIER : frontend/src/components/ui/DetailConsole.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Primitive d'interface unifiée (Phase 3.5 Refacto).
 * Remplace les redondances des consoles de détails éparpillées dans l'application
 * (Synergies, Duos, etc.) pour garantir une source unique de vérité visuelle.
 * Gère l'en-tête, les avatars dynamiques, le bouton de fermeture et l'état de chargement.
 * ============================================================================
 */
import React from 'react';
import Avatar from './Avatar.jsx';

export default function DetailConsole({
    onClose,
    leftAvatar,
    rightAvatar,
    title,
    subtitle,
    isLoading = false,
    children
}) {
    return (
        <div className="flex flex-col h-full w-full min-h-0 bg-surface-solid border border-lol-gold/40 rounded-md p-4 shadow-glass">
            <div className="flex justify-between items-start shrink-0 border-b border-border-glass pb-3 mb-3">
                <div className="flex items-center gap-4">
                    <div className="flex items-center -space-x-2">
                        {leftAvatar && <Avatar src={leftAvatar} size="base" type="champion" />}
                        {rightAvatar && <Avatar src={rightAvatar} size="base" type="champion" className="relative z-10" />}
                    </div>
                    <div className="flex flex-col gap-1">
                        <h3 className="text-lol-gold font-bold text-sm tracking-widest uppercase">
                            {title}
                        </h3>
                        <div className="text-gray-300 text-xs font-medium">
                            {subtitle}
                        </div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-red-400 transition-colors p-1 px-3 rounded hover:bg-white/5 text-lg font-bold"
                    title="Fermer l'analyse"
                >
                    ✕
                </button>
            </div>

            <div className="flex-1 min-h-0 relative">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-surface-solid/80 backdrop-blur-sm z-10 rounded-md">
                        <span className="text-lol-gold font-bold tracking-widest uppercase animate-pulse">Analyse en cours...</span>
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
}