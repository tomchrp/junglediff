/**
 * ============================================================================
 * FICHIER : frontend/src/components/synergies/LaneGrid.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Grille structurelle à 5 colonnes représentant les rôles.
 * MODIFICATION : La hauteur est désormais dynamique (plus de h-full restrictif)
 * et le scroll a été retiré des enfants pour permettre à toutes les colonnes
 * de s'étirer (stretch) à la taille de la colonne la plus remplie.
 * * DESIGN SYSTEM : Suppression des ombres rouges agressives au profit du 
 * jeton lol-loss. Utilisation des surfaces neutres pour la grille de base.
 * ============================================================================
 */
import React from 'react';
import ChampionMiniCard from './ChampionMiniCard.jsx';

const LANES = [
    { id: 'TOP', label: 'Toplane' },
    { id: 'JUNGLE', label: 'Jungle' },
    { id: 'MIDDLE', label: 'Midlane' },
    { id: 'BOTTOM', label: 'ADC' },
    { id: 'UTILITY', label: 'Support' }
];

export default function LaneGrid({ mode, currentLane, data, versionDDragon, championMap }) {
    const renderColumnContent = (laneId) => {
        const isPlayerLane = laneId === currentLane;
        const laneData = data[laneId] || [];

        if (mode === 'SYNERGIES' && isPlayerLane) {
            return (
                <div className="flex items-center justify-center border-2 border-dashed border-border-strong rounded-md p-4 h-32">
                    <span className="text-lol-textMuted font-bold text-xs text-center uppercase tracking-wider">Votre Position</span>
                </div>
            );
        }

        if (laneData.length === 0) {
            return <div className="text-lol-textMuted text-xs text-center mt-4 italic">Aucune donnée</div>;
        }

        return (
            <div className="flex flex-col gap-2">
                {laneData.map((stat, index) => (
                    <ChampionMiniCard
                        key={`${laneId}-${stat.championId}-${index}`}
                        championId={stat.championId}
                        championName={championMap[stat.championId] || 'Inconnu'}
                        winrate={stat.winrate}
                        gamesPlayed={stat.gamesPlayed}
                        versionDDragon={versionDDragon}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="grid grid-cols-5 gap-4">
            {LANES.map((lane) => {
                const isPlayerLane = lane.id === currentLane;
                const highlightOpponent = mode === 'MATCHUPS' && isPlayerLane;

                return (
                    <div
                        key={lane.id}
                        className={`flex flex-col bg-surface-solid rounded-md border ${highlightOpponent ? 'border-lol-loss/50 bg-lol-loss/5' : 'border-border-glass'} p-3 transition-colors`}
                    >
                        <div className={`text-center pb-2 mb-3 border-b ${highlightOpponent ? 'border-lol-loss/30' : 'border-border-glass'}`}>
                            <h4 className={`text-xs font-bold uppercase tracking-wider ${highlightOpponent ? 'text-lol-loss' : 'text-gray-200'}`}>
                                {lane.label} {highlightOpponent && "(Adversaire)"}
                            </h4>
                        </div>

                        <div>
                            {renderColumnContent(lane.id)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}