/**
 * ============================================================================
 * FICHIER : frontend/src/components/sidebar/PlayerStatCard.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Carte de profil du joueur affichée en haut de la Sidebar.
 * * MODIFICATIONS RECENTES :
 * - UX : Ajout d'un affichage "Non Classé" explicite si les données de 
 * classement sont nulles pour valider le fonctionnement de la pipeline.
 * - DESIGN SYSTEM : Intégration de l'icône de rang pointant vers les assets 
 * statiques locaux (/assets/ranked/).
 * ============================================================================
 */

import React from 'react';
import Avatar from '../ui/Avatar.jsx';
import StatBadge from '../ui/StatBadge.jsx';

const PlayerStatCard = ({ summary, championStats = [], onUpdate, isSyncing, versionDDragon }) => {
    if (!summary) return null;

    /**
     * Calcule les statistiques globales du joueur.
     * Si des filtres sont appliqués (championStats), recalcule le total 
     * des parties et le winrate dynamiquement. Sinon, utilise les données brutes.
     */
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

    // Détermination de la validité de l'Elo et génération du chemin d'image
    const hasRank = summary.tier && summary.rank;
    const rankIconPath = hasRank ? `/assets/ranked/${summary.tier.toLowerCase()}.png` : null;

    return (
        <div className="glass-panel p-5 flex flex-col items-center relative overflow-hidden shrink-0">
            <div className="relative mb-3">
                <Avatar
                    type="profile"
                    size="lg"
                    src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/profileicon/${summary.profileIconId}.png`}
                    alt="Profile"
                    className="w-20 h-20 shadow-glass"
                />
                <StatBadge intent="highlight">
                    {summary.summonerLevel}
                </StatBadge>
            </div>

            <h2 className="text-xl font-bold text-gray-100 text-center drop-shadow-md">
                {summary.riotIdGameName}
            </h2>
            <div className="text-lol-textMuted text-xs mb-3 font-medium tracking-wide">
                #{summary.riotIdTagline}
            </div>

            {/* Bloc d'affichage du Classement avec gestion du statut Non Classé */}
            <div className="flex items-center justify-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-border-glass mb-4 shadow-inner min-h-[36px] min-w-[120px]">
                {hasRank ? (
                    <>
                        <img
                            src={rankIconPath}
                            alt={summary.tier}
                            className="w-6 h-6 drop-shadow-md"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div className="text-lol-gold text-[10px] font-bold tracking-widest uppercase">
                            {summary.tier} {summary.rank} {summary.leaguePoints !== undefined ? ` - ${summary.leaguePoints} LP` : ''}
                        </div>
                    </>
                ) : (
                    <div className="text-lol-textMuted text-[10px] font-bold tracking-widest uppercase italic">
                        Non classé
                    </div>
                )}
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
                className="w-full py-2 bg-black/30 hover:bg-white/5 border border-transparent hover:border-border-glass rounded-lg text-xs font-bold text-lol-gold uppercase tracking-widest transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSyncing ? 'Mise à jour...' : 'Actualiser le profil'}
            </button>
        </div>
    );
};

export default PlayerStatCard;