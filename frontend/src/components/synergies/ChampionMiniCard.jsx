/**
 * ============================================================================
 * FICHIER : frontend/src/components/synergies/ChampionMiniCard.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Carte atomique affichant les statistiques croisées d'un champion spécifique.
 * Affiche l'icône, le winrate coloré et le volume de parties.
 * * DESIGN SYSTEM : Utilisation de la primitive glass-panel-interactive pour
 * gérer nativement les états de survol et les bordures. Intégration de la
 * primitive <Avatar> pour standardiser l'affichage de l'icône de champion.
 * ============================================================================
 */
import React from 'react';
import Avatar from '../ui/Avatar.jsx';

export default function ChampionMiniCard({ championId, championName, winrate, gamesPlayed, versionDDragon }) {
    // Évaluation sémantique du succès
    const isPositive = winrate >= 50;
    const colorClass = isPositive ? "text-lol-win" : "text-lol-loss";

    // Formatage du nom pour l'URL de DataDragon (suppression des espaces/caractères spéciaux si besoin)
    // Note: Dans un environnement de prod, il faut un utilitaire robuste pour formater les noms (ex: Wukong -> MonkeyKing).
    const formattedName = championName.replace(/\s+/g, '');
    const imageUrl = `https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/champion/${formattedName}.png`;

    return (
        <div className="glass-panel-interactive p-2 flex items-center gap-3">
            <Avatar
                type="champion"
                size="base"
                src={imageUrl}
                alt={championName}
            />
            <div className="flex flex-col min-w-0">
                <span className="text-gray-100 text-xs font-semibold truncate" title={championName}>
                    {championName}
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-sm font-bold ${colorClass}`}>
                        {winrate}%
                    </span>
                    <span className="text-lol-textMuted text-xs">
                        ({gamesPlayed})
                    </span>
                </div>
            </div>
        </div>
    );
}