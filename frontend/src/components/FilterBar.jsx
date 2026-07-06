/**
 * ============================================================================
 * FICHIER : frontend/src/components/FilterBar.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Barre transversale de filtrage permettant d'affiner le contexte analytique.
 * * MODIFICATIONS (Phase 3) :
 * - Intégration d'un rendu hybride (Pattern "Segmented Control").
 * - Rétrocompatibilité : Si le composant reçoit `timeFilter`, il affiche la
 * nouvelle logique Carrière/Récent (pour la vue Synergies). Sinon, il 
 * conserve son comportement original avec le sélecteur de Patch (pour l'Historique).
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

const FilterBar = ({
    puuid,
    currentLane,
    currentPatch,
    onLaneChange,
    onPatchChange,
    refreshTrigger,
    // Nouvelles props optionnelles pour la vue Synergies
    timeFilter,
    onTimeFilterChange,
    recentCount,
    onRecentCountChange
}) => {
    const [availablePatches, setAvailablePatches] = useState([]);

    // Détection du mode : Sommes-nous dans la vue Synergies ou Historique ?
    const isSynergiesMode = typeof onTimeFilterChange === 'function';

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

    const recentOptions = [
        { value: 20, label: '20 dernières parties' },
        { value: 40, label: '40 dernières parties' },
        { value: 60, label: '60 dernières parties' }
    ];

    return (
        <div className="glass-panel p-3 flex flex-wrap gap-4 items-center z-40 relative">
            <span className="text-lol-textMuted text-sm font-semibold uppercase tracking-wider ml-2 mr-2">
                Filtres :
            </span>

            {/* Section Rôles (Lanes) - Commune à toutes les vues */}
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

            {/* Séparateur visuel */}
            <div className="h-8 w-px bg-border-glass mx-2"></div>

            {/* Rendu Conditionnel du Contexte Temporel */}
            {isSynergiesMode ? (
                <div className="flex items-center gap-4">
                    <div className="flex bg-surface-elevated rounded-md p-1 border border-border-glass shadow-inner">
                        <button
                            onClick={() => onTimeFilterChange('career')}
                            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${timeFilter === 'career' ? 'bg-lol-gold text-app-dark shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Carrière
                        </button>
                        <button
                            onClick={() => onTimeFilterChange('recent')}
                            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${timeFilter === 'recent' ? 'bg-lol-gold text-app-dark shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Récent
                        </button>
                    </div>

                    {timeFilter === 'recent' && (
                        <div className="animate-fade-in">
                            <CustomSelect
                                value={recentCount}
                                options={recentOptions}
                                onChange={(val) => onRecentCountChange(Number(val))}
                            />
                        </div>
                    )}
                </div>
            ) : (
                <div className="animate-fade-in">
                    <CustomSelect
                        value={currentPatch}
                        options={patchOptions}
                        onChange={onPatchChange}
                    />
                </div>
            )}
        </div>
    );
};

export default FilterBar;