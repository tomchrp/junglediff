/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/MatchCardDivers.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Composant de la vue "Divers".
 * Gère l'affichage des métriques secondaires non classifiées dans l'analyse 
 * de rôle principale. Effectue un appel réseau isolé vers Data Dragon pour 
 * récupérer les icônes de compétences spécifiques au champion joué.
 * * DESIGN SYSTEM : Utilise les surfaces neutres (surface-solid, app) et le 
 * jeton text-lol-info pour l'accentuation des données analytiques.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';

// Dictionnaire des sorts d'invocateur pour pallier l'identifiant numérique
const SUMMONER_SPELLS = {
    4: "SummonerFlash", 11: "SummonerSmite", 12: "SummonerTeleport",
    14: "SummonerDot", 7: "SummonerHeal", 6: "SummonerHaste",
    3: "SummonerExhaust", 21: "SummonerBarrier", 1: "SummonerBoost", 32: "SummonerSnowball"
};

const SPELL_LETTERS = ['A', 'Z', 'E', 'R']; // Mapping AZERTY pour la lecture française

const MatchCardDivers = ({ currentPlayer, opponent, versionDDragon, championName }) => {
    const p = currentPlayer;
    const [spells, setSpells] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Récupération asynchrone des données du champion pour les icônes de compétences
    useEffect(() => {
        if (!versionDDragon || !championName) return;

        setIsLoading(true);
        fetch(`https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/data/fr_FR/champion/${championName}.json`)
            .then(res => res.json())
            .then(data => {
                if (data && data.data && data.data[championName]) {
                    setSpells(data.data[championName].spells);
                }
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Erreur lors de la récupération des sorts:", err);
                setIsLoading(false);
            });
    }, [versionDDragon, championName]);

    // Tableaux structurés pour le rendu dynamique
    const spellCasts = [p.spell1Casts, p.spell2Casts, p.spell3Casts, p.spell4Casts];
    const summoners = [
        { id: p.summoner1Id, casts: p.summoner1Casts },
        { id: p.summoner2Id, casts: p.summoner2Casts }
    ];

    return (
        <div className="mt-2 flex flex-col gap-6 p-2">

            {/* SECTION 1 : UTILISATION DES COMPÉTENCES */}
            <div>
                <h4 className="text-lol-gold text-xs font-bold uppercase tracking-wider mb-4">
                    Activité et Mécaniques (Sorts Lancés)
                </h4>

                <div className="flex flex-wrap gap-4 items-center">
                    {/* Les 4 compétences (A, Z, E, R) */}
                    {spellCasts.map((casts, index) => {
                        const spellInfo = spells[index];
                        const iconUrl = spellInfo
                            ? `https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/spell/${spellInfo.id}.png`
                            : null; // Fallback géré par le CSS si l'API échoue

                        return (
                            <div key={`spell-${index}`} className="relative flex flex-col items-center">
                                {/* Encadrement aligné sur le Design System */}
                                <div className="w-12 h-12 bg-surface-solid border border-border-strong rounded-md overflow-hidden shadow-sm">
                                    {iconUrl ? (
                                        <img src={iconUrl} alt={`Sort ${SPELL_LETTERS[index]}`} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-lol-textMuted font-bold">
                                            {SPELL_LETTERS[index]}
                                        </div>
                                    )}
                                </div>
                                {/* Badge de compteur sur fond noir absolu pour le contraste */}
                                <div className="absolute -bottom-2 bg-app border border-lol-info text-gray-100 text-[10px] font-bold px-1.5 py-0.5 rounded-md z-10">
                                    {casts || 0}
                                </div>
                            </div>
                        );
                    })}

                    {/* Séparateur vertical aligné sur les nouvelles bordures */}
                    <div className="w-[1px] h-10 bg-border-glass mx-2"></div>

                    {/* Les 2 Sorts d'Invocateur */}
                    {summoners.map((sum, index) => {
                        const spellName = SUMMONER_SPELLS[sum.id] || "SummonerFlash";
                        return (
                            <div key={`sum-${index}`} className="relative flex flex-col items-center">
                                <div className="w-12 h-12 bg-surface-solid border border-border-strong rounded-md overflow-hidden shadow-sm">
                                    <img
                                        src={`https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/spell/${spellName}.png`}
                                        alt={spellName}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="absolute -bottom-2 bg-app border border-lol-info text-gray-100 text-[10px] font-bold px-1.5 py-0.5 rounded-md z-10">
                                    {sum.casts || 0}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {isLoading && (
                    <div className="text-lol-textMuted text-xs italic mt-4">Chargement des icônes...</div>
                )}
            </div>

        </div>
    );
};

export default MatchCardDivers;