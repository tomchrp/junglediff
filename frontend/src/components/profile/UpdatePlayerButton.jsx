/**
 * ============================================================================
 * FICHIER : frontend/src/components/profile/UpdatePlayerButton.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Bouton d'action avec verrouillage anti-DDOS.
 * Protège le quota de l'API Riot en bloquant les requêtes manuelles
 * pendant 120 secondes après chaque clic. 
 * * DESIGN SYSTEM : Utilisation des jetons de surface neutre pour l'état 
 * désactivé et lol-gold pour l'incitation à l'action.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';

const UpdatePlayerButton = ({ onUpdate, isSyncing, puuid }) => {
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (!puuid) return;

        const checkCooldown = () => {
            const lockTime = localStorage.getItem(`update_lock_${puuid}`);
            if (lockTime) {
                const remaining = Math.ceil((parseInt(lockTime) - Date.now()) / 1000);
                if (remaining > 0) {
                    setCooldown(remaining);
                } else {
                    setCooldown(0);
                    localStorage.removeItem(`update_lock_${puuid}`);
                }
            }
        };

        checkCooldown();
        const interval = setInterval(checkCooldown, 1000);

        return () => clearInterval(interval);
    }, [puuid]);

    const handleClick = () => {
        if (cooldown > 0 || isSyncing) return;

        const lockUntil = Date.now() + 120 * 1000;
        localStorage.setItem(`update_lock_${puuid}`, lockUntil);
        setCooldown(120);

        if (onUpdate) onUpdate();
    };

    return (
        <button
            onClick={handleClick}
            disabled={cooldown > 0 || isSyncing}
            className={`px-4 py-2 rounded-md font-bold text-xs uppercase tracking-wider transition-all border
                ${cooldown > 0 || isSyncing
                    ? 'bg-surface-solid border-border-strong text-lol-textMuted cursor-not-allowed'
                    : 'bg-surface-elevated border-lol-gold text-lol-gold hover:bg-lol-gold hover:text-app cursor-pointer shadow-glow-gold'
                }`}
        >
            {isSyncing ? 'Mise à jour...' : cooldown > 0 ? `Patientez ${cooldown}s` : 'Mettre à jour'}
        </button>
    );
};

export default UpdatePlayerButton;