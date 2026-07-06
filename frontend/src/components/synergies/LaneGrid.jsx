/**
 * ============================================================================
 * FICHIER : frontend/src/components/synergies/LaneGrid.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Grille structurelle affichant les cartes de synergies/matchups par rôle.
 * * CORRECTIONS :
 * - Alignement avec le nouveau contrat de données du backend (champion_id, 
 * player_stats, timeline).
 * - Restructuration en 5 colonnes flex-col indépendantes, dotées de leur 
 * propre overflow-y-auto pour isoler le scroll.
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

    /**
     * renderColumnContent
     * * Itère sur les statistiques de la lane et mappe les nouvelles données 
     * (player_stats, timeline) vers la carte enfant.
     */
    const renderColumnContent = (laneId) => {
        const isPlayerLane = laneId === currentLane;
        const laneData = data[laneId] || [];

        if (mode === 'SYNERGIES' && isPlayerLane) {
            return (
                <div className="flex items-center justify-center border-2 border-dashed border-border-strong rounded-md p-4 h-32 mt-2">
                    <span className="text-lol-textMuted font-bold text-xs text-center uppercase tracking-wider">Votre Position</span>
                </div>
            );
        }

        if (laneData.length === 0) {
            return <div className="text-lol-textMuted text-xs text-center mt-4 italic">Aucune donnée</div>;
        }

        return laneData.map((stat, index) => (
            <ChampionMiniCard
                key={`${laneId}-${stat.champion_id}-${index}`}
                championId={stat.champion_id}
                championName={championMap[stat.champion_id] || 'Inconnu'}
                playerStats={stat.player_stats}
                timeline={stat.timeline}
                versionDDragon={versionDDragon}
            />
        ));
    };

    return (
        <div className="flex flex-row gap-4 h-full min-h-0 w-full">
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
                                {lane.label} {highlightOpponent && "(Adversaire)"}
                            </h4>
                        </div>

                        {/* CORRECTION : L'intérieur de la colonne a un scroll autonome */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2">
                            {renderColumnContent(lane.id)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}