/**
 * ============================================================================
 * FICHIER : frontend/src/components/FilterBar.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Barre transversale de filtrage (Rôle et Patch).
 * * DESIGN SYSTEM : Utilisation de la primitive CustomSelect pour remplacer
 * les balises <select> natives et bénéficier du Glassmorphism.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CustomSelect from './ui/CustomSelect.jsx';

const FilterBar = ({ puuid, currentLane, currentPatch, onLaneChange, onPatchChange, refreshTrigger }) => {
    const [availablePatches, setAvailablePatches] = useState([]);

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

    // Formatage des données pour le composant CustomSelect
    const laneOptions = [
        { value: 'ALL', label: 'Toutes les Lanes' },
        { value: 'TOP', label: 'Toplane' },
        { value: 'JUNGLE', label: 'Jungle' },
        { value: 'MIDDLE', label: 'Midlane' },
        { value: 'BOTTOM', label: 'ADC' },
        { value: 'UTILITY', label: 'Support' }
    ];

    const patchOptions = [
        { value: 'ALL', label: 'Tous les Patchs' },
        ...availablePatches.map(patch => ({ value: patch, label: `Patch ${patch}` }))
    ];

    return (
        <div className="glass-panel p-3 flex gap-4 items-center z-40 relative">
            <span className="text-lol-textMuted text-sm font-semibold uppercase tracking-wider ml-2">Filtres :</span>

            <CustomSelect
                value={currentLane}
                options={laneOptions}
                onChange={onLaneChange}
            />

            <CustomSelect
                value={currentPatch}
                options={patchOptions}
                onChange={onPatchChange}
            />
        </div>
    );
};

export default FilterBar;