/**
 * ============================================================================
 * FICHIER : frontend/src/components/sidebar/PlayerStatCard.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Carte de profil du joueur affichée en haut de la Sidebar.
 * * MODIFICATIONS RECENTES :
 * - CORRECTION UI : Ajout de la classe `shrink-0` sur le conteneur principal.
 * Cela empêche Flexbox de compresser la carte et de cacher son contenu 
 * lorsque la liste des champions située en dessous devient trop longue.
 * - CORRECTION SYNTAXE : Suppression du commentaire JSX invalide à la racine 
 * du return.
 * ============================================================================
 */

import React from 'react';

const PlayerStatCard = ({ summary, championStats = [], onUpdate, isSyncing, versionDDragon }) => {
    if (!summary) return null;

    // Calcul dynamique basé sur le filtre actif (championStats)
    const totalGames = championStats.length > 0
        ? championStats.reduce((acc, curr) => acc + curr.gamesPlayed, 0)
        : summary.totalGames || 0;

    const totalWins = championStats.length > 0
        ? championStats.reduce((acc, curr) => acc + curr.wins, 0)
        : 0;

    const winrate = totalGames > 0
        ? Math.round((totalWins / totalGames) * 100)
        : summary.winrate || 0;

    const winrateColor = winrate >= 50 ? 'text-lol-win' : 'text-lol-loss';

    // Ajout de shrink-0 sur la div principale pour interdire l'écrasement Flexbox
    return (
        <div className="glass-panel p-5 flex flex-col items-center relative overflow-hidden shrink-0">
            <div className="relative mb-3">
                <img
                    src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/profileicon/${summary.profileIconId}.png`}
                    alt="Profile"
                    className="w-20 h-20 rounded-full border-2 border-border-strong shadow-glass"
                />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-surface-solid border border-border-glass text-lol-gold text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {summary.summonerLevel}
                </div>
            </div>

            <h2 className="text-xl font-bold text-gray-100 text-center drop-shadow-md">
                {summary.riotIdGameName}
            </h2>
            <div className="text-lol-textMuted text-xs mb-4 font-medium tracking-wide">
                #{summary.riotIdTagline}
            </div>

            <div className="w-full bg-black/20 rounded-lg p-3 border border-border-glass shadow-inner mb-4 flex justify-around text-center">
                <div>
                    <div className="text-[10px] text-lol-textMuted uppercase tracking-wider font-bold mb-1">Parties</div>
                    <div className="text-sm font-bold text-gray-200">{totalGames}</div>
                </div>
                <div>
                    <div className="text-[10px] text-lol-textMuted uppercase tracking-wider font-bold mb-1">Winrate</div>
                    <div className={`text-sm font-bold ${winrateColor}`}>{winrate}%</div>
                </div>
            </div>

            <button
                onClick={onUpdate}
                disabled={isSyncing}
                className="w-full py-2 bg-black/30 hover:bg-white/5 border border-border-glass rounded-lg text-xs font-bold text-lol-gold uppercase tracking-widest transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSyncing ? 'Mise à jour...' : 'Actualiser le profil'}
            </button>
        </div>
    );
};

export default PlayerStatCard;