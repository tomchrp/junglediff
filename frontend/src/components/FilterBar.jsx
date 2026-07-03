/**
 * ============================================================================
 * FICHIER : frontend/src/components/FilterBar.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Barre transversale de filtrage permettant d'affiner l'historique des matchs.
 * Ce composant gère deux types de filtres :
 * 1. Le rôle (Lane) : Exécuté via une série de boutons utilisant la primitive 
 * <Avatar> pour un accès rapide et visuel en un clic, avec un comportement 
 * de bascule (toggle).
 * 2. Le patch : Conservé dans un menu déroulant <CustomSelect> car il s'agit 
 * d'une action secondaire moins fréquente.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CustomSelect from './ui/CustomSelect.jsx';
import Avatar from './ui/Avatar.jsx';

const LANES = [
    { id: 'ALL', icon: 'all', label: 'Toutes les Lanes' },
    { id: 'TOP', icon: 'top', label: 'Toplane' },
    { id: 'JUNGLE', icon: 'jungle', label: 'Jungle' },
    { id: 'MIDDLE', icon: 'mid', label: 'Midlane' },
    { id: 'BOTTOM', icon: 'bot', label: 'ADC' },
    { id: 'UTILITY', icon: 'support', label: 'Support' }
];

const FilterBar = ({ puuid, currentLane, currentPatch, onLaneChange, onPatchChange, refreshTrigger }) => {
    const [availablePatches, setAvailablePatches] = useState([]);

    /**
     * Effectue l'appel réseau pour récupérer la liste dynamique des patchs 
     * joués par l'utilisateur. Se déclenche au chargement ou lors d'un forçage
     * de rafraîchissement (refreshTrigger).
     */
    useEffect(() => {
        if (!puuid) {
            setAvailablePatches([]);
            return;
        }

        const fetchPatches = async () => {
            try {
                const res = await axios.get(`http://localhost:8000/api/v1/matches/${puuid}/patches`);
                setAvailablePatches(res.data.patches || []);
            } catch (error) {
                console.error("Erreur lors de la récupération des patchs :", error);
            }
        };

        fetchPatches();
    }, [puuid, refreshTrigger]);

    /**
     * Gère la sélection d'un rôle dans la barre de filtres.
     * Implémente une logique de bascule (toggle) : si l'utilisateur clique 
     * sur un rôle qui est déjà actif, le filtre est automatiquement réinitialisé 
     * sur 'ALL' pour éviter des clics inutiles.
     * * @param {string} laneId - L'identifiant de la lane sélectionnée (ex: 'TOP').
     */
    const handleLaneToggle = (laneId) => {
        if (currentLane === laneId && laneId !== 'ALL') {
            onLaneChange('ALL');
        } else {
            onLaneChange(laneId);
        }
    };

    const patchOptions = [
        { value: 'ALL', label: 'Tous les Patchs' },
        ...availablePatches.map(patch => ({ value: patch, label: `Patch ${patch}` }))
    ];

    return (
        <div className="glass-panel p-3 flex gap-4 items-center z-40 relative">
            <span className="text-lol-textMuted text-sm font-semibold uppercase tracking-wider ml-2 mr-2">
                Filtres :
            </span>

            {/* Section Rôles (Lanes) - Rendu sous forme de boutons Avatar */}
            <div className="flex gap-2 items-center">
                {LANES.map(lane => (
                    <button
                        key={lane.id}
                        onClick={() => handleLaneToggle(lane.id)}
                        title={lane.label}
                        className="transition-transform hover:scale-105 outline-none focus:outline-none rounded-md"
                    >
                        <Avatar
                            type="rune"
                            size="sm"
                            src={`/assets/lanes/${lane.icon}.png`}
                            alt={lane.label}
                            isSelected={currentLane === lane.id}
                        />
                    </button>
                ))}
            </div>

        
            {/* Section Patch - Volet déroulant intact */}
            <CustomSelect
                value={currentPatch}
                options={patchOptions}
                onChange={onPatchChange}
            />
        </div>
    );
};

export default FilterBar;