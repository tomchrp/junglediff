/**
 * ============================================================================
 * FICHIER : frontend/src/components/global/GlobalChampionsView.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Vue expérimentale de restitution Big Data communautaire.
 * Intègre la nouvelle télémétrie du Data Lake (Vérification de l'ingestion)
 * et les analyses avancées de Snowballing basées sur les timelines.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Database, Activity, TrendingUp, AlertTriangle } from 'lucide-react';
import Avatar from '../ui/Avatar';

const GlobalChampionsView = () => {
    const [stats, setStats] = useState([]);
    const [telemetry, setTelemetry] = useState(null);
    const [snowball, setSnowball] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                // Exécution en parallèle pour réduire le temps de chargement global
                const [champsRes, telemetryRes, snowballRes] = await Promise.all([
                    axios.get('http://localhost:8000/api/v1/global/champions'),
                    axios.get('http://localhost:8000/api/v1/global/telemetry'),
                    axios.get('http://localhost:8000/api/v1/global/snowball')
                ]);

                setStats(champsRes.data.data);
                setTelemetry(telemetryRes.data);
                setSnowball(snowballRes.data);
            } catch (err) {
                console.error("Erreur lors de la récupération du Big Data", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[500px]">
                <div className="animate-pulse text-lol-gold font-bold flex items-center gap-2">
                    <Database className="animate-bounce" /> Agrégation des données massives...
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-none p-6 pb-2 border-b border-border-glass">
                <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-3">
                    <Database className="w-6 h-6 text-lol-gold" />
                    Laboratoire Big Data
                </h1>
                <p className="text-sm text-lol-textMuted mt-1">
                    Validation de l'ingestion asynchrone et des métriques temporelles à 15 minutes.
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* BLOC A : Télémétrie du Data Lake */}
                {telemetry && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="glass-panel p-4 flex items-center justify-between">
                            <div>
                                <div className="text-sm text-gray-400 font-bold">Matchs (Hot Storage)</div>
                                <div className="text-2xl font-bold tabular-nums text-gray-100 mt-1">
                                    {telemetry.total_matches.toLocaleString()}
                                </div>
                            </div>
                            <Activity className="w-8 h-8 text-blue-500 opacity-50" />
                        </div>
                        <div className="glass-panel p-4 flex items-center justify-between">
                            <div>
                                <div className="text-sm text-gray-400 font-bold">Timelines (Warm Storage)</div>
                                <div className="text-2xl font-bold tabular-nums text-gray-100 mt-1">
                                    {telemetry.total_timelines.toLocaleString()}
                                </div>
                            </div>
                            <Database className="w-8 h-8 text-purple-500 opacity-50" />
                        </div>
                        <div className="glass-panel p-4 flex items-center justify-between">
                            <div>
                                <div className="text-sm text-gray-400 font-bold">Couverture Temporelle</div>
                                <div className={`text-2xl font-bold tabular-nums mt-1 ${telemetry.timeline_coverage_percent > 80 ? 'text-lol-win' : 'text-lol-gold'}`}>
                                    {telemetry.timeline_coverage_percent}%
                                </div>
                            </div>
                            {telemetry.timeline_coverage_percent < 100 && (
                                <AlertTriangle className="w-6 h-6 text-lol-gold animate-pulse" title="Certaines parties n'ont pas de timeline téléchargée." />
                            )}
                        </div>
                    </div>
                )}

                {/* BLOC B : Analyse du Snowball (Validation 15 minutes) */}
                {snowball && snowball.winrate_analysis.snowballing && (
                    <div className="glass-panel p-6 border-l-4 border-l-lol-gold">
                        <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2 mb-4">
                            <TrendingUp className="w-5 h-5 text-lol-gold" />
                            Impact du Snowball à 15 Minutes
                        </h2>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Probabilité de Victoire */}
                            <div className="space-y-4">
                                <div className="bg-surface-elevated p-4 rounded border border-border-strong flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-gray-200">Avance aux Golds (≥ 1000g)</div>
                                        <div className="text-xs text-lol-textMuted mt-1">Échantillon : {snowball.winrate_analysis.snowballing.games} parties</div>
                                    </div>
                                    <div className="text-3xl font-bold tabular-nums text-lol-win">
                                        {snowball.winrate_analysis.snowballing.winrate}%
                                    </div>
                                </div>
                                <div className="bg-surface-elevated p-4 rounded border border-border-strong flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-gray-200">Retard ou Égalité</div>
                                        <div className="text-xs text-lol-textMuted mt-1">Échantillon : {snowball.winrate_analysis.behind_or_even?.games || 0} parties</div>
                                    </div>
                                    <div className="text-3xl font-bold tabular-nums text-lol-loss">
                                        {snowball.winrate_analysis.behind_or_even?.winrate || 0}%
                                    </div>
                                </div>
                            </div>

                            {/* Générateurs d'écart */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Top Générateurs d'Or</h3>
                                <div className="space-y-2">
                                    {snowball.top_snowballers.map((champ, index) => (
                                        <div key={champ.champion_id} className="flex items-center justify-between p-2 rounded bg-surface-elevated/50">
                                            <div className="flex items-center gap-3">
                                                <div className="text-gray-500 font-bold w-4">{index + 1}.</div>
                                                <Avatar
                                                    type="champion"
                                                    id={champ.champion_id}
                                                    size="sm"
                                                />
                                                <div className="text-xs text-gray-400">({champ.games} games)</div>
                                            </div>
                                            <div className="text-lol-gold font-bold tabular-nums">
                                                +{champ.avg_gold_diff}g
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tableau Classique (Limité aux 50 premiers pour la performance DOM) */}
                <div className="glass-panel overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-surface-elevated text-xs uppercase text-lol-textMuted border-b border-border-strong">
                            <tr>
                                <th className="px-6 py-4 font-bold">Champion</th>
                                <th className="px-6 py-4 font-bold">Parties (Big Data)</th>
                                <th className="px-6 py-4 font-bold">Winrate Moyen</th>
                                <th className="px-6 py-4 font-bold">KDA Moyen</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-glass">
                            {stats.slice(0, 50).map((champ) => (
                                <tr key={champ.champion_id} className="hover:bg-surface-elevated/30 transition-colors">
                                    <td className="px-6 py-3">
                                        <Avatar type="champion" id={champ.champion_id} size="md" />
                                    </td>
                                    <td className="px-6 py-3 font-bold tabular-nums text-gray-300">
                                        {champ.games}
                                    </td>
                                    <td className={`px-6 py-3 font-bold tabular-nums ${champ.winrate >= 50 ? 'text-lol-win' : 'text-lol-loss'}`}>
                                        {champ.winrate}%
                                    </td>
                                    <td className="px-6 py-3 text-gray-400 tabular-nums">
                                        {champ.kda.k} / {champ.kda.d} / {champ.kda.a}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GlobalChampionsView;