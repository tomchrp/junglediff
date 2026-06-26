import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
        // L'ajout de refreshTrigger force le refetch à la fin de l'ingestion ARQ
    }, [puuid, refreshTrigger]);

    return (
        <div className="bg-lol-blue border border-lol-border rounded-lg p-3 flex gap-4 items-center shadow-md">
            <span className="text-[#a0a0a0] text-sm font-semibold uppercase tracking-wider ml-2">Filtres :</span>

            <select
                value={currentLane}
                onChange={(e) => onLaneChange(e.target.value)}
                className="bg-lol-dark text-white px-3 py-1.5 outline-none border border-lol-border focus:border-lol-gold rounded cursor-pointer text-sm"
            >
                <option value="ALL">Toutes les Lanes</option>
                <option value="TOP">Top</option>
                <option value="JUNGLE">Jungle</option>
                <option value="MIDDLE">Mid</option>
                <option value="BOTTOM">ADC</option>
                <option value="UTILITY">Support</option>
            </select>

            <select
                value={currentPatch}
                onChange={(e) => onPatchChange(e.target.value)}
                className="bg-lol-dark text-white px-3 py-1.5 outline-none border border-lol-border focus:border-lol-gold rounded cursor-pointer text-sm"
            >
                <option value="ALL">Tous les Patchs</option>
                {availablePatches.map((patch) => (
                    <option key={patch} value={patch}>Patch {patch}</option>
                ))}
            </select>
        </div>
    );
};

export default FilterBar;