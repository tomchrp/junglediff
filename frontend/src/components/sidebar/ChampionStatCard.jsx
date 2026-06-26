/**
 * ============================================================================
 * FICHIER : frontend/src/components/sidebar/ChampionStatCard.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Affiche les statistiques résumées d'un champion spécifique dans la Sidebar.
 * Accepte désormais la version de DataDragon en paramètre (versionDDragon) 
 * pour garantir que les images des champions nouvellement sortis s'affichent 
 * correctement. Intègre une image de secours via onError.
 * ============================================================================
 */

import React from 'react';

const ChampionStatCard = ({ championName, gamesPlayed, wins, winrate, isSelected, versionDDragon, onClick }) => {
    const winrateColor = winrate >= 50 ? 'text-green-500' : 'text-red-500';

    const cardStyle = isSelected
        ? 'bg-[#091428] border-lol-gold shadow-[0_0_10px_rgba(200,170,110,0.2)]'
        : 'bg-[#010a13] border-lol-border hover:border-[#4a5058]';

    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-3 mb-2 flex items-center gap-4 rounded-sm border transition-all duration-200 cursor-pointer ${cardStyle}`}
        >
            <img
                src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon || '14.12.1'}/img/champion/${championName}.png`}
                alt={championName}
                className={`w-12 h-12 rounded-sm border ${isSelected ? 'border-lol-gold' : 'border-lol-border'}`}
                onError={(e) => { e.target.src = `https://ddragon.leagueoflegends.com/cdn/${versionDDragon || '14.12.1'}/img/profileicon/29.png`; }}
            />

            <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-sm truncate">
                    {championName}
                </div>
                <div className={`font-semibold text-xs mt-1 ${winrateColor}`}>
                    {winrate}% WR
                </div>
                <div className="text-[#a0a0a0] text-xs mt-0.5 truncate">
                    {gamesPlayed} parties ({wins} V - {gamesPlayed - wins} D)
                </div>
            </div>
        </button>
    );
};

export default ChampionStatCard;