/**
 * ============================================================================
 * FICHIER : frontend/src/components/FilterBar.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Composant correspondant au bloc "Bleu fonce" de la maquette.
 * Contient les selecteurs de Patch et de Lane pour filtrer dynamiquement
 * les statistiques de la Sidebar et les parties de l'Historique.
 * ============================================================================
 */

import React from 'react';

const FilterBar = ({ currentLane, currentPatch, onLaneChange, onPatchChange }) => {
    return (
        <div className="bg-lol-blue border border-lol-border rounded-lg p-3 flex gap-4 items-center shadow-md">
            <span className="text-[#a0a0a0] text-sm font-semibold uppercase tracking-wider ml-2">Filtres :</span>

            {/* Selecteur de Lane */}
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

            {/* Selecteur de Patch */}
            <select
                value={currentPatch}
                onChange={(e) => onPatchChange(e.target.value)}
                className="bg-lol-dark text-white px-3 py-1.5 outline-none border border-lol-border focus:border-lol-gold rounded cursor-pointer text-sm"
            >
                <option value="ALL">Tous les Patchs</option>
                <option value="16.12">Patch 16.12</option>
                {/* On pourra dynamiser cette liste plus tard selon les parties en base */}
            </select>
        </div>
    );
};

export default FilterBar;