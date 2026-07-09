/**
 * ============================================================================
 * FICHIER : frontend/src/components/admin/CrawlerDashboard.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Panneau de contrôle du Crawler Big Data.
 *
 * MODIFICATIONS (RÉCONCILIATION) :
 * - Suppression du compteur obsolète "Joueurs Traduits".
 * - Remplacement par "Total Joueurs Explorés" déduit de la base de données.
 * - Ajout du bouton "Recalculer / Sync" pour forcer la réparation du cache 
 * JSON en lisant la réalité des tables SQL.
 * ============================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Activity, Play, Pause, Database, Users, Server, PlayCircle, Trash2, Filter, Wifi, WifiOff, BarChart, RefreshCw } from 'lucide-react';

const TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
const DIVISIONS = ["I", "II", "III", "IV"];

const QUEUE_MAP = {
    "420": "Solo/Duo",
    "440": "Flex 5v5",
    "400": "Draft Normal"
};

const safeNumber = (val) => (typeof val === 'number' ? val : 0);
const safeObject = (val) => (typeof val === 'object' && val !== null && !Array.isArray(val) ? val : {});

const CrawlerDashboard = () => {
    const [metrics, setMetrics] = useState({
        is_active: false,
        crawler_mode: "DISCOVERY_AND_DETAILS",
        total_requests: 0,
        aggregated_metrics: {}
    });

    const [sseConnected, setSseConnected] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    const [seedPuuid, setSeedPuuid] = useState('');
    const [leagueForm, setLeagueForm] = useState({ tier: 'DIAMOND', division: 'I', queue: 'RANKED_SOLO_5x5' });

    const isMutatingRef = useRef(false);

    useEffect(() => {
        const eventSource = new EventSource('http://localhost:8000/api/v1/crawler/stream-metrics');

        eventSource.onopen = () => setSseConnected(true);

        eventSource.onmessage = (event) => {
            if (isMutatingRef.current) return;
            try {
                const data = JSON.parse(event.data);
                if (data && typeof data === 'object') {
                    setMetrics(prev => ({ ...prev, ...data }));
                }
            } catch (err) {
                console.error("Erreur de parsing", err);
            }
        };

        eventSource.onerror = () => setSseConnected(false);

        return () => eventSource.close();
    }, []);

    const handleToggle = async () => {
        isMutatingRef.current = true;
        const newState = !metrics?.is_active;
        setMetrics(prev => ({ ...prev, is_active: newState }));

        try {
            const res = await axios.post('http://localhost:8000/api/v1/crawler/toggle', { is_active: newState });
            setStatusMessage(res.data.message);
        } catch (error) {
            setStatusMessage("Erreur réseau.");
            setMetrics(prev => ({ ...prev, is_active: !newState }));
        } finally {
            setTimeout(() => { isMutatingRef.current = false; }, 1000);
        }
    };

    const handleSetMode = async (mode) => {
        isMutatingRef.current = true;
        setMetrics(prev => ({ ...prev, crawler_mode: mode }));
        try {
            const res = await axios.post('http://localhost:8000/api/v1/crawler/set-mode', { mode });
            setStatusMessage(`Mode défini : ${res.data.crawler_mode}`);
        } catch (error) {
            setStatusMessage("Erreur.");
        } finally {
            setTimeout(() => { isMutatingRef.current = false; }, 1000);
        }
    };

    const handlePurge = async () => {
        if (window.confirm("Danger : Vider toutes les files d'attente ?")) {
            try {
                const res = await axios.post('http://localhost:8000/api/v1/crawler/purge');
                setStatusMessage(res.data.message);
                setMetrics(prev => ({ ...prev, is_active: false, aggregated_metrics: {} }));
            } catch (error) {
                setStatusMessage("Erreur purge.");
            }
        }
    };

    const handleSync = async () => {
        setStatusMessage("Reconstruction du cache via SQL en cours...");
        try {
            const res = await axios.post('http://localhost:8000/api/v1/crawler/sync-metrics');
            setStatusMessage(res.data.message);
        } catch (error) {
            setStatusMessage("Échec de la synchronisation SQL.");
        }
    };

    const handleSeedPuuid = async (e) => {
        e.preventDefault();
        if (!seedPuuid.trim()) return;
        try {
            const res = await axios.post('http://localhost:8000/api/v1/crawler/seed', { puuid: seedPuuid.trim() });
            setStatusMessage(res.data.message);
            setSeedPuuid('');
        } catch (error) {
            setStatusMessage("Erreur injection.");
        }
    };

    const handleSeedLeague = async (e) => {
        e.preventDefault();
        setStatusMessage(`Injection ${leagueForm.tier} ${leagueForm.division} en cours...`);
        try {
            const res = await axios.post('http://localhost:8000/api/v1/crawler/seed-league', leagueForm);
            setStatusMessage(res.data.message);
        } catch (error) {
            setStatusMessage("Erreur amorçage.");
        }
    };

    const agg = metrics?.aggregated_metrics || {};
    const detailsCount = safeNumber(agg?.details_crawled);
    const timelinesCount = safeNumber(agg?.timelines_crawled);

    const detailsByQueue = safeObject(agg?.details_by_queue);
    const timelinesByQueue = safeObject(agg?.timelines_by_queue);
    const playersByTier = safeObject(agg?.players_by_tier);

    // Calcul du total de joueurs explorés en additionnant les divisions
    const totalPlayers = Object.values(playersByTier).reduce((acc, count) => acc + (typeof count === 'number' ? count : 0), 0);

    return (
        <div className="min-h-screen bg-app p-8 text-gray-100 font-sans">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-border-glass pb-4">
                    <div className="flex items-center gap-3">
                        <Activity className={`w-8 h-8 ${metrics?.is_active ? 'text-lol-gold animate-pulse' : 'text-lol-textMuted'}`} />
                        <h1 className="text-2xl font-bold uppercase tracking-wider text-lol-gold">Nexus Big Data</h1>
                        <div className="ml-4 flex items-center gap-2 text-xs font-bold">
                            {sseConnected ? (
                                <span className="flex items-center gap-1 text-green-400"><Wifi className="w-4 h-4" /> Connecté</span>
                            ) : (
                                <span className="flex items-center gap-1 text-red-500 animate-pulse"><WifiOff className="w-4 h-4" /> Déconnecté</span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 text-sm font-bold rounded-full border ${metrics?.is_active ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-red-900/30 border-red-500 text-red-400'}`}>
                            {metrics?.is_active ? 'EN COURS D\'INGESTION' : 'EN PAUSE'}
                        </span>

                        <button onClick={handleSync} className="flex items-center gap-2 px-4 py-2 rounded font-bold transition-all bg-surface-elevated text-blue-400 border border-blue-500/50 hover:bg-blue-500 hover:text-white" title="Reconstruire les métriques depuis la BDD">
                            <RefreshCw className="w-5 h-5" />
                        </button>

                        <button onClick={handlePurge} className="flex items-center gap-2 px-4 py-2 rounded font-bold transition-all bg-surface-elevated text-lol-loss border border-lol-loss/50 hover:bg-lol-loss hover:text-white" title="Vider les files">
                            <Trash2 className="w-5 h-5" />
                        </button>

                        <button onClick={handleToggle} className={`flex items-center gap-2 px-6 py-2 rounded font-bold transition-all shadow-lg ${metrics?.is_active ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-lol-gold hover:bg-lol-goldHover text-app'}`}>
                            {metrics?.is_active ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                            {metrics?.is_active ? 'Interrompre' : 'Démarrer'}
                        </button>
                    </div>
                </div>

                {statusMessage && (
                    <div className="bg-surface-elevated border border-lol-gold/30 text-lol-gold px-4 py-3 rounded">
                        {statusMessage}
                    </div>
                )}

                {/* MODES */}
                <div className="glass-panel p-6 flex flex-col gap-4 bg-surface-solid border border-border-glass">
                    <h3 className="font-bold text-gray-100 flex items-center gap-2 mb-2"><Filter className="w-5 h-5 text-lol-gold" />Vitesse et Cible d'Ingestion</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button onClick={() => handleSetMode("DISCOVERY_AND_DETAILS")} className={`p-4 rounded border text-left transition-all ${metrics?.crawler_mode === 'DISCOVERY_AND_DETAILS' ? 'bg-lol-gold/10 border-lol-gold text-lol-gold' : 'bg-surface-elevated border-border-strong text-gray-400 hover:border-gray-500'}`}>
                            <div className="font-bold mb-1">Exploration Complète</div>
                            <div className="text-xs opacity-80">Découvre de nouveaux joueurs et télécharge les détails des matchs. (Snowballing)</div>
                        </button>
                        <button onClick={() => handleSetMode("DETAILS_ONLY")} className={`p-4 rounded border text-left transition-all ${metrics?.crawler_mode === 'DETAILS_ONLY' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-surface-elevated border-border-strong text-gray-400 hover:border-gray-500'}`}>
                            <div className="font-bold mb-1">Bridé (Détails Seulement)</div>
                            <div className="text-xs opacity-80">Dépile la file sans découvrir de nouveaux joueurs.</div>
                        </button>
                        <button onClick={() => handleSetMode("TIMELINES_ONLY")} className={`p-4 rounded border text-left transition-all ${metrics?.crawler_mode === 'TIMELINES_ONLY' ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-surface-elevated border-border-strong text-gray-400 hover:border-gray-500'}`}>
                            <div className="font-bold mb-1">Rattrapage Timelines</div>
                            <div className="text-xs opacity-80">Scanne la base pour télécharger les timelines manquantes.</div>
                        </button>
                    </div>
                </div>

                {/* COMPTEURS GLOBAUX */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="glass-panel p-6 flex flex-col items-center justify-center text-center">
                        <Server className="w-8 h-8 text-purple-400 mb-2" />
                        <span className="text-4xl font-bold text-gray-100">{metrics?.total_requests || 0}</span>
                        <span className="text-xs text-lol-textMuted uppercase mt-1">Requêtes API Riot</span>
                    </div>
                    <div className="glass-panel p-6 flex flex-col items-center justify-center text-center border-t-4 border-t-blue-500/50">
                        <Database className="w-8 h-8 text-blue-400 mb-2" />
                        <span className="text-4xl font-bold text-gray-100">{detailsCount}</span>
                        <span className="text-xs text-lol-textMuted uppercase mt-1">Détails Ingérés</span>
                    </div>
                    <div className="glass-panel p-6 flex flex-col items-center justify-center text-center border-t-4 border-t-purple-500/50">
                        <PlayCircle className="w-8 h-8 text-purple-400 mb-2" />
                        <span className="text-4xl font-bold text-gray-100">{timelinesCount}</span>
                        <span className="text-xs text-lol-textMuted uppercase mt-1">Timelines Ingérées</span>
                    </div>
                    <div className="glass-panel p-6 flex flex-col items-center justify-center text-center border-t-4 border-t-green-500/50">
                        <Users className="w-8 h-8 text-green-500 mb-2" />
                        <span className="text-4xl font-bold text-gray-100">{totalPlayers}</span>
                        <span className="text-xs text-lol-textMuted uppercase mt-1">Joueurs en Base</span>
                    </div>
                </div>

                {/* DÉTAIL DES MÉTRIQUES */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-panel p-4 bg-surface-solid border border-border-glass">
                        <h4 className="text-sm font-bold text-blue-400 mb-3 border-b border-border-glass pb-2 flex items-center gap-2">
                            <BarChart className="w-4 h-4" /> Répartition Détails
                        </h4>
                        <ul className="space-y-2">
                            {Object.entries(detailsByQueue).map(([queueId, count]) => (
                                <li key={queueId} className="flex justify-between text-sm">
                                    <span className="text-gray-400">{QUEUE_MAP[queueId] || `Queue ${queueId}`}</span>
                                    <span className="font-bold">{count}</span>
                                </li>
                            ))}
                            {Object.keys(detailsByQueue).length === 0 && <li className="text-sm text-gray-600 italic">Aucune donnée</li>}
                        </ul>
                    </div>

                    <div className="glass-panel p-4 bg-surface-solid border border-border-glass">
                        <h4 className="text-sm font-bold text-purple-400 mb-3 border-b border-border-glass pb-2 flex items-center gap-2">
                            <BarChart className="w-4 h-4" /> Répartition Timelines
                        </h4>
                        <ul className="space-y-2">
                            {Object.entries(timelinesByQueue).map(([queueId, count]) => (
                                <li key={queueId} className="flex justify-between text-sm">
                                    <span className="text-gray-400">{QUEUE_MAP[queueId] || `Queue ${queueId}`}</span>
                                    <span className="font-bold">{count}</span>
                                </li>
                            ))}
                            {Object.keys(timelinesByQueue).length === 0 && <li className="text-sm text-gray-600 italic">Aucune donnée</li>}
                        </ul>
                    </div>

                    <div className="glass-panel p-4 bg-surface-solid border border-border-glass">
                        <h4 className="text-sm font-bold text-green-400 mb-3 border-b border-border-glass pb-2 flex items-center gap-2">
                            <Users className="w-4 h-4" /> Démographie Base
                        </h4>
                        <ul className="space-y-2">
                            {Object.entries(playersByTier).map(([tier, count]) => (
                                <li key={tier} className="flex justify-between text-sm">
                                    <span className="text-gray-400">{tier}</span>
                                    <span className="font-bold">{count}</span>
                                </li>
                            ))}
                            {Object.keys(playersByTier).length === 0 && <li className="text-sm text-gray-600 italic">Aucune donnée</li>}
                        </ul>
                    </div>
                </div>

                {/* ZONES D'AMORÇAGE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <div className="glass-panel p-6 border-t-4 border-t-lol-gold">
                        <h2 className="text-lg font-bold text-lol-gold mb-4 border-b border-border-glass pb-2">Amorçage Massif (League-V4)</h2>
                        <form onSubmit={handleSeedLeague} className="flex flex-col gap-4">
                            <div className="flex gap-2">
                                <select
                                    className="flex-1 bg-surface-solid text-gray-100 px-3 py-2 border border-border-strong rounded focus:border-lol-gold outline-none"
                                    value={leagueForm.tier}
                                    onChange={e => setLeagueForm({ ...leagueForm, tier: e.target.value })}
                                >
                                    {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <select
                                    className="w-24 bg-surface-solid text-gray-100 px-3 py-2 border border-border-strong rounded focus:border-lol-gold outline-none"
                                    value={leagueForm.division}
                                    onChange={e => setLeagueForm({ ...leagueForm, division: e.target.value })}
                                    disabled={['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(leagueForm.tier)}
                                >
                                    {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <button type="submit" className="w-full bg-lol-gold text-app px-6 py-2 rounded font-bold hover:bg-lol-goldHover">
                                Déclencher le Snowballing
                            </button>
                        </form>
                    </div>

                    <div className="glass-panel p-6 border-t-4 border-t-blue-500">
                        <h2 className="text-lg font-bold text-blue-400 mb-4 border-b border-border-glass pb-2">Amorçage Unitaire (PUUID)</h2>
                        <form onSubmit={handleSeedPuuid} className="flex flex-col gap-4">
                            <input
                                type="text"
                                placeholder="Entrez un PUUID exact..."
                                value={seedPuuid}
                                onChange={(e) => setSeedPuuid(e.target.value)}
                                className="w-full bg-surface-solid text-gray-100 px-4 py-2 outline-none border border-border-strong focus:border-blue-500 rounded font-mono text-sm"
                            />
                            <button type="submit" disabled={!seedPuuid.trim()} className="w-full bg-surface-elevated text-blue-400 border border-blue-500/50 px-6 py-2 rounded font-bold hover:bg-blue-500 hover:text-white disabled:opacity-50">
                                Cibler le joueur
                            </button>
                        </form>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CrawlerDashboard;