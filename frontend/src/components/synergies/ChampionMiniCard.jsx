/**
 * ============================================================================
 * FICHIER : frontend/src/components/synergies/ChampionMiniCard.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Composant hybride (Scanner Rapide / Panneau Analytique).
 * * CORRECTIONS :
 * - Ajout strict de shrink-0 sur le conteneur pour interdire l'étirement Flexbox.
 * - Restauration du calcul local de l'URL DDragon pour satisfaire la primitive Avatar.
 * - Nettoyage des couleurs pour coller au Design System (bg-black/20).
 * ============================================================================
 */
import React, { useState } from 'react';
import Avatar from '../ui/Avatar.jsx';
import StatDelta from '../ui/StatDelta.jsx';
import MatchupTimeChart from './MatchupTimeChart.jsx';

export default function ChampionMiniCard({
    championId,
    championName,
    versionDDragon,
    playerStats,
    timeline
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpand = (e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    const matches = playerStats?.matches || 0;
    const wins = playerStats?.wins || 0;
    const winrate = playerStats?.winrate || 0;
    const delta = playerStats?.delta || 0;

    // CORRECTION : Reconstruction de l'URL pour le composant Avatar
    const formattedName = championName.replace(/\s+/g, '');
    const imageUrl = `https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/champion/${formattedName}.png`;

    return (
        // CORRECTION : shrink-0 pour éviter l'étirement, couleurs standards
        <div
            className="shrink-0 flex flex-col bg-surface-elevated rounded-md border border-border-glass overflow-hidden cursor-pointer hover:bg-white/5 transition-colors"
            onClick={toggleExpand}
        >
            <div className="flex flex-row items-center justify-between p-2">
                <div className="flex items-center gap-2">
                    <Avatar
                        type="champion"
                        src={imageUrl}
                        size="md"
                        alt={championName}
                    />
                    <span className="text-xs font-semibold text-gray-200 truncate max-w-[80px]" title={championName}>
                        {championName}
                    </span>
                </div>

                <div className="flex flex-col items-end justify-center min-w-[50px]">
                    <span className="text-lg font-bold text-gray-100 tabular-nums leading-none">
                        {winrate.toFixed(1)}%
                    </span>
                    <div className="mt-1">
                        <StatDelta value={delta} />
                    </div>
                </div>
            </div>

            <div
                className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}
            >
                {/* CORRECTION : Utilisation de bg-black/20 existant au lieu de couleurs inventées */}
                <div className="border-t border-border-glass bg-black/20 p-2 flex flex-col">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-xs text-lol-textMuted font-medium uppercase tracking-wider">
                            Volume de jeu
                        </span>
                        <span className="text-xs font-bold text-gray-300">
                            {matches} parties ({wins}V / {matches - wins}D)
                        </span>
                    </div>

                    <MatchupTimeChart timeline={timeline} />
                </div>
            </div>
        </div>
    );
}