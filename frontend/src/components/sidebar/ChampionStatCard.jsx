/**
 * ============================================================================
 * FICHIER : frontend/src/components/sidebar/ChampionStatCard.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Affiche les statistiques résumées d'un champion spécifique dans la Sidebar.
 * * MODIFICATIONS RECENTES :
 * - CORRECTION : Remplacement de glass-panel-interactive par un fond sombre 
 * (bg-black/20) pour respecter la règle du Nested Glassmorphism (pas de double 
 * blur sur des éléments imbriqués).
 * ============================================================================
 */

import React from 'react';
import Avatar from '../ui/Avatar.jsx';

const ChampionStatCard = ({ championName, gamesPlayed, wins, winrate, isSelected, versionDDragon, onClick }) => {
    const winrateColor = winrate >= 50 ? 'text-lol-win' : 'text-lol-loss';

    // Application stricte de la règle du "fond creusé" sans flou additionnel
    const cardStyle = isSelected
        ? 'bg-black/40 border-lol-gold shadow-[inset_0_0_10px_rgba(200,170,110,0.2)]'
        : 'bg-black/20 border-border-glass hover:bg-white/5 hover:-translate-y-[1px]';

    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-3 mb-2 flex items-center gap-4 rounded-lg transition-all duration-200 cursor-pointer border ${cardStyle}`}
        >
            <Avatar
                type="champion"
                size="md"
                src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon || '14.12.1'}/img/champion/${championName}.png`}
                alt={championName}
                isSelected={isSelected}
            />

            <div className="flex-1 min-w-0">
                <div className="text-gray-100 font-bold text-sm truncate">
                    {championName}
                </div>
                <div className={`font-semibold text-xs mt-1 ${winrateColor}`}>
                    {winrate}% WR
                </div>
                <div className="text-lol-textMuted text-xs mt-0.5 truncate">
                    {gamesPlayed} parties ({wins} V - {gamesPlayed - wins} D)
                </div>
            </div>
        </button>
    );
};

export default ChampionStatCard;