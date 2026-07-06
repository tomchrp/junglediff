/**
 * ============================================================================
 * FICHIER : frontend/src/components/synergies/LaneGrid.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Grille structurelle affichant les cartes de synergies/matchups par rôle.
 * 
 * MODIFICATIONS :
 * - Ajout de la prop `selectedTargetLane` pour vérifier la condition d'unicité.
 * - Le booléen `isSelected` valide désormais l'ID du champion ET le rôle.
 * ============================================================================
 */
import React, { useEffect, useRef } from 'react';
import ChampionMiniCard from './ChampionMiniCard.jsx';

const LANES = [
    { id: 'TOP', label: 'Toplane' },
    { id: 'JUNGLE', label: 'Jungle' },
    { id: 'MIDDLE', label: 'Midlane' },
    { id: 'BOTTOM', label: 'ADC' },
    { id: 'UTILITY', label: 'Support' }
];

export default function LaneGrid({ mode, currentLane, data, versionDDragon, championMap, selectedChampionId, selectedTargetLane, onSelectMatchup }) {
    const selectedCardRef = useRef(null);

    /**
     * Effet de recentrage de la vue.
     * Scroll automatiquement vers la carte active après la résolution 
     * de l'animation CSS de la console (310ms).
     */
    useEffect(() => {
        if (selectedCardRef.current) {
            const timer = setTimeout(() => {
                selectedCardRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 310);
            return () => clearTimeout(timer);
        }
    }, [selectedChampionId, selectedTargetLane, data]);

    const renderColumnContent = (lane) => {
        const isPlayerLane = lane.id === currentLane;
        const laneData = data[lane.id] || [];

        if (mode === 'SYNERGIES' && isPlayerLane) {
            return (
                <div className="flex items-center justify-center border-2 border-dashed border-border-strong rounded-md p-4 h-16 mt-2 shrink-0">
                    <span className="text-lol-textMuted font-bold text-xs text-center uppercase tracking-wider">Votre Position</span>
                </div>
            );
        }

        if (laneData.length === 0) {
            return <div className="text-lol-textMuted text-xs text-center mt-4 italic">Aucune donnée</div>;
        }

        return laneData.map((stat, index) => {
            // Unicité absolue : Il faut que l'ID corresponde ET que la colonne corresponde
            const isSelected = selectedChampionId === stat.champion_id && selectedTargetLane === lane.id;

            return (
                <ChampionMiniCard
                    key={`${lane.id}-${stat.champion_id}-${index}`}
                    ref={isSelected ? selectedCardRef : null}
                    championId={stat.champion_id}
                    championName={championMap[stat.champion_id] || 'Inconnu'}
                    playerStats={stat.player_stats}
                    timeline={stat.timeline}
                    versionDDragon={versionDDragon}
                    isSelected={isSelected}
                    onClick={() => onSelectMatchup(isSelected ? null : { ...stat, targetLane: lane.id })}
                />
            );
        });
    };

    return (
        <div className="flex flex-row gap-3 h-full min-h-0 w-full">
            {LANES.map((lane) => {
                const isPlayerLane = lane.id === currentLane;
                const highlightOpponent = mode === 'MATCHUPS' && isPlayerLane;

                return (
                    <div
                        key={lane.id}
                        className={`flex flex-col flex-1 bg-surface-solid rounded-md border ${highlightOpponent ? 'border-lol-loss/50 bg-lol-loss/5' : 'border-border-glass'} p-2 transition-colors overflow-hidden h-full`}
                    >
                        <div className={`text-center pb-2 mb-2 border-b shrink-0 ${highlightOpponent ? 'border-lol-loss/30' : 'border-border-glass'}`}>
                            <h4 className={`text-xs font-bold uppercase tracking-wider ${highlightOpponent ? 'text-lol-loss' : 'text-gray-200'}`}>
                                {lane.label}
                            </h4>
                        </div>
                        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-1 flex flex-col gap-1.5">
                            {renderColumnContent(lane)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}