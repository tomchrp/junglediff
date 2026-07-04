/**
 * ============================================================================
 * FICHIER : frontend/src/components/global/GlobalChampionsView.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Composant de restitution visuelle du Big Data.
 * Affiche la ventilation exacte des parties ingérées selon leur mode de jeu
 * (récupéré depuis le JSONB backend) afin de garantir l'absence de pollution 
 * par des files non désirées (ARAM, Arena, etc.).
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GlobalChampionsView = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * Exécute l'appel réseau vers l'API d'agrégation.
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
                <p>Analyse du Big Data et extraction JSON en cours...</p>
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
                <h2 className="text-xl font-bold text-lol-gold uppercase tracking-wider mb-4">
                    Analyse Globale des Champions
                </h2>

                {/* Section Contrôle de Qualité des Données */}
                <div className="bg-surface-elevated p-4 rounded border border-border-strong mb-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold text-gray-100 uppercase tracking-wider">
                            Intégrité de la Base de Données
                        </h3>
                        <span className="text-xs text-lol-textMuted font-mono">
                            Total : {stats.total_matches_in_db.toLocaleString()} matchs
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {stats.modes_repartition?.map((mode) => {
                            const isLegit = ['420', '440', '400'].includes(mode.queue_id);

                            return (
                                <div
                                    key={mode.queue_id}
                                    className={`px-3 py-1.5 rounded flex flex-col border ${isLegit
                                            ? 'bg-blue-900/20 border-blue-500/30 text-blue-100'
                                            : 'bg-red-900/30 border-red-500/60 text-red-100'
                                        }`}
                                >
                                    <span className="text-[10px] uppercase font-bold opacity-75">
                                        {isLegit ? mode.name : `POLLUTION: ${mode.name}`}
                                    </span>
                                    <span className="font-mono font-bold text-sm">
                                        {mode.count.toLocaleString()}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

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