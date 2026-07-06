/**
 * ============================================================================
 * FICHIER : frontend/src/components/synergies/ChampionMiniCard.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Carte de sélection ultra-compacte.
 * * MODIFICATIONS :
 * - Ajout d'une coloration conditionnelle (vert/rouge) sur le winrate absolu 
 * du joueur en se basant sur le pivot de 50%.
 * ============================================================================
 */
import React, { forwardRef } from 'react';
import Avatar from '../ui/Avatar.jsx';
import StatDelta from '../ui/StatDelta.jsx';

const formatCompactNumber = (number) => {
    if (!number) return '0';
    if (number < 1000) return number.toString();
    return (number / 1000).toFixed(1) + 'k';
};

// Fonction utilitaire pour colorer les winrates absolus
const getWinrateColorClass = (wr) => {
    return wr >= 50 ? 'text-lol-win' : 'text-lol-loss';
};

const ChampionMiniCard = forwardRef(({
    championId,
    championName,
    versionDDragon,
    playerStats,
    timeline,
    isSelected,
    onClick
}, ref) => {
    const matches = playerStats?.matches || 0;
    const winrate = playerStats?.winrate || 0;
    const delta = playerStats?.delta || 0;

    const globalWinrate = winrate - delta;
    const globalMatches = timeline ? timeline.reduce((acc, b) => acc + (b.global_matches || 0), 0) : 0;

    const formattedName = championName.replace(/\s+/g, '');
    const imageUrl = `https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/champion/${formattedName}.png`;

    return (
        <div
            ref={ref}
            className={`shrink-0 flex flex-row items-center justify-start p-1.5 gap-2 rounded-md border cursor-pointer transition-all ${isSelected
                    ? 'bg-white/10 border-lol-gold shadow-glow-gold'
                    : 'bg-surface-elevated border-border-glass opacity-80 hover:opacity-100 hover:bg-white/5'
                }`}
            onClick={onClick}
            title={`${championName} - ${matches} parties jouées (Référentiel global : ${globalMatches})`}
        >
            <Avatar
                type="champion"
                src={imageUrl}
                size="sm"
                alt={championName}
            />

            <div className="flex flex-col items-start justify-center min-w-0 flex-1">
                <div className="flex items-center justify-between w-full mb-0.5 pr-1">
                    {/* Application de la couleur dynamique sur le winrate */}
                    <span className={`text-xs font-bold tabular-nums leading-none ${getWinrateColorClass(winrate)}`}>
                        {winrate.toFixed(1)}%
                    </span>
                    <div className="transform scale-75 origin-right whitespace-nowrap">
                        <StatDelta value={winrate} opponentValue={globalWinrate} />
                    </div>
                </div>
                <span className="text-[9px] text-lol-textMuted font-medium truncate w-full">
                    {matches} p. <span className="text-gray-500">/ {formatCompactNumber(globalMatches)}</span>
                </span>
            </div>
        </div>
    );
});

ChampionMiniCard.displayName = 'ChampionMiniCard';

export default ChampionMiniCard;