/**
 * ============================================================================
 * FICHIER : frontend/src/components/global/DuoRowCard.jsx
 * ============================================================================
 * MODIFICATIONS :
 * - Implémentation du pivot visuel (Left/Right) basé sur le primaryLane.
 */
import React from 'react';
import Avatar from '../ui/Avatar.jsx';
import StatDelta from '../ui/StatDelta.jsx';

const getLaneIcon = (lane) => {
    const map = { TOP: 'top', JUNGLE: 'jungle', MIDDLE: 'mid', BOTTOM: 'bot', UTILITY: 'support' };
    return map[lane?.toUpperCase()] || 'all';
};

const DuoRowCard = ({ rank, duo, isActive, onClick, versionDDragon, championMap, primaryLane }) => {

    // CORRECTION : Détermination de l'ancrage gauche/droite
    const isPrimaryA = duo.lane_a === primaryLane;

    const leftChamp = isPrimaryA ? duo.champ_a : duo.champ_b;
    const leftLane = isPrimaryA ? duo.lane_a : duo.lane_b;

    const rightChamp = isPrimaryA ? duo.champ_b : duo.champ_a;
    const rightLane = isPrimaryA ? duo.lane_b : duo.lane_a;

    const champNameLeft = championMap?.[leftChamp] || "Unknown";
    const champNameRight = championMap?.[rightChamp] || "Unknown";

    const srcLeft = `https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/champion/${champNameLeft.replace(/\s+/g, '')}.png`;
    const srcRight = `https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/champion/${champNameRight.replace(/\s+/g, '')}.png`;

    return (
        <div
            onClick={onClick}
            className={`flex items-center w-full h-full px-4 rounded-md border transition-all cursor-pointer ${isActive
                    ? 'bg-surface-elevated border-lol-gold/50 shadow-md transform scale-[1.01] z-10 relative'
                    : 'bg-surface-solid border-border-glass hover:bg-surface-elevated hover:border-gray-500'
                }`}
        >
            <div className="w-12 flex-none text-lol-textMuted font-bold text-lg tabular-nums">
                #{rank}
            </div>

            <div className="flex items-center -space-x-3 flex-none mr-8">
                <div className="relative z-10 border-2 border-app rounded-md">
                    <Avatar type="champion" src={srcLeft} size="md" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-app rounded-full flex items-center justify-center p-[1px]">
                        <Avatar type="lane" size="xs" src={`/assets/lanes/${getLaneIcon(leftLane)}.png`} className="opacity-80 grayscale" />
                    </div>
                </div>
                <div className="relative z-0 border-2 border-app rounded-md">
                    <Avatar type="champion" src={srcRight} size="md" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-app rounded-full flex items-center justify-center p-[1px]">
                        <Avatar type="lane" size="xs" src={`/assets/lanes/${getLaneIcon(rightLane)}.png`} className="opacity-80 grayscale" />
                    </div>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-3 gap-4 items-center">
                <div className="flex flex-col">
                    <span className="text-[10px] text-lol-textMuted uppercase font-bold tracking-widest">Winrate</span>
                    <span className="text-xl text-gray-100 font-bold tabular-nums">
                        {(duo.duo_wr * 100).toFixed(1)}%
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-lol-textMuted uppercase font-bold tracking-widest">Synergie</span>
                    <StatDelta value={Number(duo.synergy_delta) || 0} format="percentage" size="lg" />
                </div>
                <div className="flex flex-col items-end text-right">
                    <span className="text-[10px] text-lol-textMuted uppercase font-bold tracking-widest">Volume</span>
                    <span className="text-sm text-lol-textMuted tabular-nums">
                        {new Intl.NumberFormat('fr-FR').format(duo.total_matches)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default DuoRowCard;