/**
 * ============================================================================
 * FICHIER : frontend/src/components/profile/UpdatePlayerButton.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Bouton d'action avec verrouillage anti-DDOS.
 * Protège le quota de l'API Riot en bloquant les requêtes manuelles
 * pendant 120 secondes après chaque clic. L'état persiste via localStorage.
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

        checkCooldown(); // Vérification initiale
        const interval = setInterval(checkCooldown, 1000); // Boucle de compte à rebours

        return () => clearInterval(interval);
    }, [puuid]);

    const handleClick = () => {
        if (cooldown > 0 || isSyncing) return;

        // Verrouille l'action pour les 120 prochaines secondes
        const lockUntil = Date.now() + 120 * 1000;
        localStorage.setItem(`update_lock_${puuid}`, lockUntil);
        setCooldown(120);

        if (onUpdate) onUpdate();
    };

    return (
        <button
            onClick={handleClick}
            disabled={cooldown > 0 || isSyncing}
            className={`px-4 py-2 rounded font-bold text-xs uppercase tracking-wider transition-colors border
                ${cooldown > 0 || isSyncing
                    ? 'bg-gray-800 border-gray-600 text-gray-500 cursor-not-allowed'
                    : 'bg-lol-blue border-lol-gold text-lol-gold hover:bg-lol-dark hover:text-white cursor-pointer shadow-[0_0_10px_rgba(200,170,110,0.15)]'}`}
        >
            {isSyncing ? 'Mise à jour...' : cooldown > 0 ? `Patientez ${cooldown}s` : 'Mettre à jour'}
        </button>
    );
};

export default UpdatePlayerButton;