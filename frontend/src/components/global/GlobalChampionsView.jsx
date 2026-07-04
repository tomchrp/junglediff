/**
 * ============================================================================
 * FICHIER : frontend/src/components/global/GlobalChampionsView.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Composant de restitution visuelle du Big Data.
 * Interroge l'API globale pour récupérer et afficher les statistiques 
 * d'utilisation (Winrate, Pickrate brut) de tous les champions stockés 
 * dans le Hot Storage de la base de données.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GlobalChampionsView = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * Effectue l'appel API vers la route d'agrégation globale des champions.
     * Gère les états de chargement et d'erreur de la requête.
     */
    useEffect(() => {
        const fetchGlobalStats = async () => {
            try {
                setLoading(true);
                const response = await axios.get('http://localhost:8000/api/v1/global/champions');
                setStats(response.data);
                setError(null);
            } catch (err) {
                console.error("Erreur récupération stats globales:", err);
                setError("Impossible de charger les statistiques globales.");
            } finally {
                setLoading(false);
            }
        };

        fetchGlobalStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full p-8 text-lol-gold">
                <p>Analyse du Big Data en cours...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-lol-loss bg-red-900/20 border border-lol-loss rounded">
                <p>{error}</p>
            </div>
        );
    }

    if (!stats || stats.champions.length === 0) {
        return (
            <div className="p-4 text-gray-400">
                <p>Aucune donnée disponible. Lancez le crawler pour ingérer des parties.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-surface-solid text-gray-100 p-4 overflow-y-auto custom-scrollbar">
            <div className="mb-6 border-b border-border-glass pb-4">
                <h2 className="text-xl font-bold text-lol-gold uppercase tracking-wider">
                    Analyse Globale des Champions
                </h2>
                <p className="text-sm text-lol-textMuted mt-1">
                    Volume analysé : {stats.total_analyzed_participations.toLocaleString()} participations
                </p>
            </div>

            <div className="space-y-2">
                <div className="grid grid-cols-4 gap-4 px-2 py-1 text-xs font-bold text-lol-textMuted uppercase border-b border-border-strong">
                    <div className="col-span-2">Champion ID</div>
                    <div className="text-right">Matchs</div>
                    <div className="text-right">Winrate</div>
                </div>

                {stats.champions.map((champ) => (
                    <div
                        key={champ.champion_id}
                        className="grid grid-cols-4 gap-4 px-2 py-3 bg-surface-elevated border border-border-glass rounded hover:border-lol-gold/50 transition-colors items-center"
                    >
                        <div className="col-span-2 font-bold text-gray-200">
                            {champ.champion_id}
                        </div>
                        <div className="text-right font-mono text-blue-400">
                            {champ.total_matches.toLocaleString()}
                        </div>
                        <div className={`text-right font-bold ${champ.winrate >= 50 ? 'text-lol-win' : 'text-lol-loss'}`}>
                            {champ.winrate}%
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GlobalChampionsView;