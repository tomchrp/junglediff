/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/MatchCardSummary.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Sous-composant d'affichage. Génère le tableau de bord global de la partie
 * en listant les 10 joueurs répartis en deux colonnes (Équipe 100 et 200).
 * ============================================================================
 */

import React from 'react';

const MatchCardSummary = ({ team100, team200, playerPuuid, versionDDragon, championMap, currentServer, onPlayerSearch }) => {

    /**
     * Construit la ligne visuelle d'un joueur avec son KDA, son champion et son inventaire.
     * Isole l'événement de clic pour la redirection de profil.
     */
    const renderParticipantRow = (p) => {
        const isTargetUser = p.puuid === playerPuuid;
        const playerItems = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6];
        const imageChampName = championMap[p.championId] || "Inconnu";

        return (
            <div key={p.puuid} className={`flex items-center justify-between p-2 rounded-sm transition-colors ${isTargetUser ? 'bg-[#c8aa6e]/15 border border-[#c8aa6e]/30 shadow-sm' : 'hover:bg-lol-blue/40'}`}>
                <div className="flex items-center gap-2 w-5/12 min-w-0 shrink-0">
                    <img src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/champion/${imageChampName}.png`} alt={imageChampName} className="w-6 h-6 rounded-sm border border-lol-border shrink-0" onError={(e) => e.target.src = 'https://ddragon.leagueoflegends.com/cdn/14.12.1/img/profileicon/29.png'} />
                    {p.teamPosition && <img src={`/assets/lanes/${p.teamPosition.toLowerCase()}.png`} alt={p.teamPosition} className="w-4 h-4 shrink-0 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />}
                    <span onClick={(e) => { e.stopPropagation(); onPlayerSearch(currentServer, p.riotIdGameName, p.riotIdTagline); }} className={`text-xs truncate cursor-pointer hover:underline transition-colors ${isTargetUser ? 'text-lol-gold font-bold hover:text-[#d4b980]' : 'text-gray-300 hover:text-white'}`}>
                        {p.riotIdGameName}
                    </span>
                </div>
                <div className="text-center text-[11px] text-gray-400 font-medium w-3/12 shrink-0">
                    {p.kills}/{p.deaths}/{p.assists}
                </div>
                <div className="flex gap-0.5 w-4/12 justify-end shrink-0">
                    {playerItems.map((itemId, idx) => (
                        <div key={idx} className="w-5 h-5 bg-lol-dark rounded-sm border border-lol-border/30 overflow-hidden shrink-0">
                            {itemId > 0 && <img src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/item/${itemId}.png`} alt="Objet" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
            <div className="flex flex-col gap-1 border-r lg:border-r border-lol-border/10 pr-2">
                {team100.map(p => renderParticipantRow(p))}
            </div>
            <div className="flex flex-col gap-1 pl-1">
                {team200.map(p => renderParticipantRow(p))}
            </div>
        </div>
    );
};

export default MatchCardSummary;