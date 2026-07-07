/**
 * ============================================================================
 * FICHIER : frontend/src/components/FilterBar.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Barre transversale de filtrage centralisée pour l'application.
 * * * MODIFICATIONS (Phase 4 - Meta Duos) :
 * - Intégration du mode `isMetaDuosMode`.
 * - Transforme le composant pour gérer 3 états distincts : 
 * 1. Historique (Lane + Patch)
 * 2. Synergies (Lane + Contexte Temporel Carrière/Récent)
 * 3. Meta Duos (Lane d'ancrage + Lane de croisement)
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
    // Props de base (Historique)
    puuid,
    currentLane,
    currentPatch,
    onLaneChange,
    onPatchChange,
    refreshTrigger,

    // Props optionnelles (Vue Synergies)
    timeFilter,
    onTimeFilterChange,
    recentCount,
    onRecentCountChange,

    // Props optionnelles (Vue Meta Duos)
    isMetaDuosMode,
    primaryLane,
    secondaryLane,
    onPrimaryChange,
    onSecondaryChange
}) => {
    const [availablePatches, setAvailablePatches] = useState([]);

    // Déduction sémantique des modes pour la lisibilité
    const isSynergiesMode = typeof onTimeFilterChange === 'function' && !isMetaDuosMode;
    const isHistoryMode = !isSynergiesMode && !isMetaDuosMode;

    useEffect(() => {
        // En mode Meta globale, on ne requiert pas l'API joueur pour les patchs
        if (!puuid || isMetaDuosMode) {
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
    }, [puuid, refreshTrigger, isMetaDuosMode]);

    // ==========================================
    // LOGIQUE : HISTORIQUE & SYNERGIES
    // ==========================================
    const handleLaneToggle = (laneId) => {
        if (currentLane === laneId && laneId !== 'ALL') {
            onLaneChange('ALL');
        } else {
            onLaneChange(laneId);
        }
    };

    // ==========================================
    // LOGIQUE : META DUOS (Règles d'exclusion)
    // ==========================================
    const handlePrimaryClick = (laneId) => {
        if (laneId === secondaryLane) {
            onSecondaryChange('ALL');
        }
        onPrimaryChange(laneId);
    };

    const handleSecondaryClick = (laneId) => {
        if (laneId === primaryLane) return; // Empêche la même lane

        if (secondaryLane === laneId) {
            onSecondaryChange('ALL'); // Toggle off
        } else {
            onSecondaryChange(laneId);
        }
    };

    // ==========================================
    // OPTIONS DES SELECTS
    // ==========================================
    const patchOptions = [
        { value: 'ALL', label: 'Tous les Patchs' },
        ...availablePatches.map(patch => ({ value: patch, label: `Patch ${patch}` }))
    ];

    const recentOptions = [
        { value: 20, label: '20 dernières parties' },
        { value: 40, label: '40 dernières parties' },
        { value: 60, label: '60 dernières parties' }
    ];

    // ==========================================
    // RENDU : MODE META DUOS (Double ligne)
    // ==========================================
    if (isMetaDuosMode) {
        return (
            <div className="glass-panel p-4 flex flex-col gap-4 z-40 relative border-b border-border-glass">
                {/* Ligne 1 : Rôle Principal (Ancrage) */}
                <div className="flex items-center gap-4">
                    <span className="text-lol-textMuted text-xs font-bold uppercase tracking-wider w-32">
                        Rôle d'ancrage :
                    </span>
                    <div className="flex gap-2 items-center">
                        {LANES.map(lane => (
                            <button
                                key={`primary-${lane.id}`}
                                onClick={() => handlePrimaryClick(lane.id)}
                                title={lane.label}
                                className="transition-transform hover:scale-105 outline-none focus:outline-none rounded-md"
                            >
                                <Avatar
                                    type="rune"
                                    size="sm"
                                    src={`/assets/lanes/${lane.icon}.png`}
                                    alt={lane.label}
                                    isSelected={primaryLane === lane.id}
                                />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Ligne 2 : Rôle Secondaire (Croisement) */}
                <div className="flex items-center gap-4">
                    <span className="text-lol-textMuted text-xs font-bold uppercase tracking-wider w-32">
                        Croiser avec :
                    </span>
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={() => onSecondaryChange('ALL')}
                            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-colors border ${secondaryLane === 'ALL'
                                    ? 'bg-surface-elevated text-lol-gold border-lol-gold/50'
                                    : 'border-transparent text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            Toutes Lanes
                        </button>

                        <div className="h-4 w-px bg-border-glass mx-1"></div>

                        {LANES.map(lane => {
                            const isPrimary = lane.id === primaryLane;
                            return (
                                <button
                                    key={`secondary-${lane.id}`}
                                    onClick={() => handleSecondaryClick(lane.id)}
                                    disabled={isPrimary}
                                    title={isPrimary ? "Déjà sélectionné en rôle principal" : lane.label}
                                    className={`transition-transform outline-none focus:outline-none rounded-md ${isPrimary ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:scale-105'
                                        }`}
                                >
                                    <Avatar
                                        type="rune"
                                        size="sm"
                                        src={`/assets/lanes/${lane.icon}.png`}
                                        alt={lane.label}
                                        isSelected={secondaryLane === lane.id}
                                    />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDU : MODE STANDARD (Historique / Synergies)
    // ==========================================
    return (
        <div className="glass-panel p-3 flex flex-wrap gap-4 items-center z-40 relative">
            <span className="text-lol-textMuted text-sm font-semibold uppercase tracking-wider ml-2 mr-2">
                Filtres :
            </span>

            {/* Section Rôles (Lanes) */}
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

            <div className="h-8 w-px bg-border-glass mx-2"></div>

            {/* Section Contexte Temporel */}
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