/**
 * ============================================================================
 * FICHIER : frontend/src/components/sidebar/ChampionStatCard.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Affiche les statistiques résumées d'un champion spécifique dans la Sidebar.
 * Ce composant utilise le Design System pour sa structure (Glassmorphism),
 * mais conserve la gestion d'image originelle (rounded-sm) pour éviter le 
 * rognage intempestif des artworks de DataDragon.
 * ============================================================================
 */

import React from 'react';

const ChampionStatCard = ({ championName, gamesPlayed, wins, winrate, isSelected, versionDDragon, onClick }) => {
    // Application de la règle sémantique : Winrate >= 50% = Succès
    const winrateColor = winrate >= 50 ? 'text-lol-win' : 'text-lol-loss';

    // Remplacement des couleurs en dur par les classes utilitaires du Design System
    const cardStyle = isSelected
        ? 'bg-surface-elevated border-lol-gold shadow-glow-gold'
        : 'glass-panel-interactive';

    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-3 mb-2 flex items-center gap-4 rounded-lg transition-all duration-200 cursor-pointer border ${cardStyle}`}
        >
            {/* RESTAURATION EXACTE DE TON IMAGE */}
            <img
                src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon || '14.12.1'}/img/champion/${championName}.png`}
                alt={championName}
                className={`w-12 h-12 rounded-sm border shrink-0 ${isSelected ? 'border-lol-gold' : 'border-border-strong'}`}
                onError={(e) => { e.target.src = `https://ddragon.leagueoflegends.com/cdn/${versionDDragon || '14.12.1'}/img/profileicon/29.png`; }}
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