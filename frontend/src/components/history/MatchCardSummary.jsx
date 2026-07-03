/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/MatchCardSummary.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Scoreboard universel de la partie. Permet une comparaison verticale 
 * instantanée des 10 joueurs sur les métriques clés (KDA, Dégâts, Économie).
 * 
 * MODIFICATIONS RECENTES :
 * - Remplacement de toutes les balises <img> par la primitive <Avatar>.
 * - Suppression des icônes de lane (redondantes avec le tri par rôle).
 * - Ajout du Kill Participation (KP%) sous le KDA.
 * - Ajout de la jauge de dégâts (relative au maximum de l'équipe).
 * - Création d'un bloc économique empilé (Golds, Score de Vision, CS/min).
 * - Déplacement des Runes et Summoner Spells à côté de l'inventaire.
 * - Refonte du Highlight joueur avec le Design System (bordure dorée).
 * ============================================================================
 */

import React from 'react';
import Avatar from '../ui/Avatar.jsx';

const SUMMONER_SPELLS = { 4: "SummonerFlash", 11: "SummonerSmite", 12: "SummonerTeleport", 14: "SummonerDot", 7: "SummonerHeal", 6: "SummonerHaste", 3: "SummonerExhaust", 21: "SummonerBarrier", 1: "SummonerBoost", 32: "SummonerSnowball" };
const RUNE_PATHS = { 8000: "7201_Precision", 8100: "7200_Domination", 8200: "7202_Sorcery", 8300: "7203_Whimsy", 8400: "7204_Resolve" };
const KEYSTONE_PATHS = {
    8008: "Styles/Precision/LethalTempo/LethalTempoTemp", 8005: "Styles/Precision/PressTheAttack/PressTheAttack", 8010: "Styles/Precision/Conqueror/Conqueror", 8021: "Styles/Precision/FleetFootwork/FleetFootwork",
    8112: "Styles/Domination/Electrocute/Electrocute", 8124: "Styles/Domination/Predator/Predator", 8128: "Styles/Domination/DarkHarvest/DarkHarvest", 8106: "Styles/Domination/HailOfBlades/HailOfBlades",
    8214: "Styles/Sorcery/SummonAery/SummonAery", 8229: "Styles/Sorcery/ArcaneComet/ArcaneComet", 8230: "Styles/Sorcery/PhaseRush/PhaseRush",
    8437: "Styles/Resolve/GraspOfTheUndying/GraspOfTheUndying", 8439: "Styles/Resolve/VeteranAftershock/VeteranAftershock", 8465: "Styles/Resolve/Guardian/Guardian",
    8351: "Styles/Inspiration/GlacialAugment/GlacialAugment", 8360: "Styles/Inspiration/UnsealedSpellbook/UnsealedSpellbook", 8369: "Styles/Inspiration/FirstStrike/FirstStrike"
};

const MatchCardSummary = ({ team100, team200, playerPuuid, versionDDragon, championMap, currentServer, onPlayerSearch, gameDuration }) => {

    // Pré-calculs globaux pour générer les jauges et pourcentages relatifs à l'équipe
    const team100Kills = team100.reduce((acc, p) => acc + p.kills, 0);
    const team200Kills = team200.reduce((acc, p) => acc + p.kills, 0);
    const maxDmg100 = Math.max(...team100.map(p => p.totalDamageDealtToChampions), 1);
    const maxDmg200 = Math.max(...team200.map(p => p.totalDamageDealtToChampions), 1);
    
    const durationMin = gameDuration / 60;

    /**
     * Génère la structure visuelle d'une ligne représentant un joueur dans le scoreboard.
     * Effectue les calculs de KP%, de ratio de dégâts et de CS/min à la volée.
     *
     * @param {Object} p - L'objet participant contenant les statistiques brutes du joueur.
     * @param {number} teamKills - Le total de kills de l'équipe du joueur (pour le KP%).
     * @param {number} maxTeamDmg - Le maximum de dégâts infligés par un joueur de l'équipe (pour la jauge).
     * @param {string} teamColorClass - La classe Tailwind définissant la couleur de la jauge (Bleu/Rouge).
     * @returns {JSX.Element} La ligne complète du tableau de bord.
     */
    const renderParticipantRow = (p, teamKills, maxTeamDmg, teamColorClass) => {
        const isTargetUser = p.puuid === playerPuuid;
        const imageChampName = championMap[p.championId] || "Inconnu";
        
        // Métriques dérivées
        const kp = teamKills > 0 ? Math.round(((p.kills + p.assists) / teamKills) * 100) : 0;
        const dmgPct = Math.round((p.totalDamageDealtToChampions / maxTeamDmg) * 100);
        const totalCS = (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0);
        const csMin = durationMin > 0 ? (totalCS / durationMin).toFixed(1) : "0.0";
        const goldFormatted = (p.goldEarned / 1000).toFixed(1) + "k";

        // Identification de la Keystone
        const keystoneId = p.perks?.primarySelection || p.perks?.styles?.[0]?.selections?.[0]?.perk || p.keystone_id;
        const keystonePath = KEYSTONE_PATHS[keystoneId] || RUNE_PATHS[p.perks?.primaryStyle] || "7200_Domination";

        // Mise en surbrillance stricte respectant le Design System pour le joueur cible
        const rowStyle = isTargetUser 
            ? "bg-surface-elevated border-lol-gold shadow-glow-gold z-10" 
            : "border-transparent hover:bg-surface-elevated";

        return (
            <div key={p.puuid} className={`flex items-center justify-between px-2 py-1.5 rounded-md border transition-colors ${rowStyle}`}>
                
                {/* 1. Bloc Identité (Champion + Pseudo) */}
                <div
                    className="flex items-center gap-2 w-[110px] shrink-0 cursor-pointer group"
                    onClick={(e) => { e.stopPropagation(); onPlayerSearch(currentServer, p.riotIdGameName, p.riotIdTagline); }}
                >
                    <Avatar 
                        type="champion" 
                        size="sm" 
                        src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/champion/${imageChampName}.png`} 
                        alt={imageChampName} 
                        isSelected={isTargetUser} 
                    />
                    <span className={`text-[11px] truncate transition-colors group-hover:underline ${isTargetUser ? 'text-lol-gold font-bold' : 'text-lol-textMuted group-hover:text-gray-100'}`}>
                        {p.riotIdGameName}
                    </span>
                </div>

                {/* 2. Bloc KDA & KP% */}
                <div className="w-[60px] flex flex-col items-center justify-center shrink-0">
                    <div className="text-[11px] font-bold text-gray-200">
                        {p.kills}/<span className="text-lol-loss">{p.deaths}</span>/{p.assists}
                    </div>
                    <div className="text-[9px] text-lol-textMuted mt-[1px]">{totalCS} cs ({csMin})</div>
                    <div className="text-[10px] font-medium text-lol-textMuted mt-0.5">{kp}% KP</div>
                </div>

                

                

                {/* 5. Bloc Équipement complet (Sorts, Runes, Objets) */}
                <div className="flex items-center gap-2 shrink-0">
                    
                    <div className="flex gap-1">
                        <div className="flex flex-col gap-[2px]">
                            <Avatar type="spell" size="xs" src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/spell/${SUMMONER_SPELLS[p.summoner1Id] || "SummonerFlash"}.png`} />
                            <Avatar type="spell" size="xs" src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/spell/${SUMMONER_SPELLS[p.summoner2Id] || "SummonerFlash"}.png`} />
                        </div>
                        <div className="flex flex-col gap-[2px]">
                            <Avatar type="rune" size="xs" src={`https://ddragon.leagueoflegends.com/cdn/img/perk-images/${keystonePath}.png`} className="bg-black" />
                            <Avatar type="rune" size="xs" src={`https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/${RUNE_PATHS[p.perks?.subStyle] || "7201_Precision"}.png`} className="opacity-70" />
                        </div>
                    </div>
                    
                    <div className="flex gap-[2px]">
                        {[p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].map((itemId, idx) => (
                            itemId > 0 ? (
                                <Avatar key={idx} type="item" size="xs" src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/item/${itemId}.png`} />
                            ) : (
                                <div key={idx} className="w-5 h-5 bg-surface-solid rounded-md border border-border-glass shrink-0"></div>
                            )
                        ))}
                    </div>

                </div>

            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
            <div className="flex flex-col gap-1 border-r lg:border-r border-border-glass pr-2">
                {team100.map(p => renderParticipantRow(p, team100Kills, maxDmg100, 'bg-blue-400'))}
            </div>
            <div className="flex flex-col gap-1 pl-1">
                {team200.map(p => renderParticipantRow(p, team200Kills, maxDmg200, 'bg-red-400'))}
            </div>
        </div>
    );
};

export default MatchCardSummary;