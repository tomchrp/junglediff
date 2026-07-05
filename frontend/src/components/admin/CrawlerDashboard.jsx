/**
 * ============================================================================
 * FICHIER : frontend/src/components/admin/CrawlerDashboard.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Panneau de contrôle du Crawler Big Data.
 * Se connecte au flux SSE du backend pour afficher les métriques en temps réel.
 * Permet l'injection d'une graine, le contrôle du cycle de vie (Start/Pause),
 * et la sélection de la vitesse d'ingestion (Modes à 3 états).
 * * MODIFICATIONS (PHASE 4 BIG DATA) :
 * - Remplacement du toggle `extraction_only` par un sélecteur `crawler_mode`.
 * - Interfaçage avec la nouvelle route API `/set-mode`.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Play, Pause, Database, Users, Server, PlayCircle, Trash2, Filter } from 'lucide-react';

const CrawlerDashboard = () => {
    const [metrics, setMetrics] = useState({
        is_active: false,
        crawler_mode: "DISCOVERY_AND_DETAILS", // Remplacement du booléen
        total_requests: 0,
        players_pending: 0,
        matches_pending: 0,
        total_crawled: 0
    });
    const [seedPuuid, setSeedPuuid] = useState('');
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        // Connexion au flux SSE du backend
        const eventSource = new EventSource('http://localhost:8000/api/v1/crawler/stream-metrics');

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setMetrics(data);
            } catch (err) {
                console.error("Erreur de parsing des métriques SSE", err);
            }
        };

        eventSource.onerror = () => {
            console.error("Perte de connexion au flux de métriques du Crawler.");
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, []);

    // Basculer Start/Pause
    const handleToggle = async () => {
        try {
            const newState = !metrics.is_active;
            const res = await axios.post('http://localhost:8000/api/v1/crawler/toggle', { is_active: newState });
            setStatusMessage(res.data.message);
            setMetrics(prev => ({ ...prev, is_active: newState }));
        } catch (error) {
            setStatusMessage("Erreur lors du basculement de l'état.");
            console.error(error);
        }
    };

    // Changer le mode d'ingestion (3 vitesses)
    const handleSetMode = async (mode) => {
        try {
            const res = await axios.post('http://localhost:8000/api/v1/crawler/set-mode', { mode });
            setMetrics(prev => ({ ...prev, crawler_mode: res.data.crawler_mode }));
            setStatusMessage(`Mode changé avec succès : ${mode}`);
        } catch (error) {
            setStatusMessage("Erreur lors du changement de mode. Vérifiez le terminal backend.");
            console.error(error);
        }
    };

    // Purger les files d'attente
    const handlePurge = async () => {
        if (window.confirm("Êtes-vous sûr de vouloir vider toutes les files d'attente ?")) {
            try {
                const res = await axios.post('http://localhost:8000/api/v1/crawler/purge');
                setStatusMessage(res.data.message);
                setMetrics(prev => ({ ...prev, is_active: false, players_pending: 0, matches_pending: 0 }));
            } catch (error) {
                setStatusMessage("Erreur lors de la purge.");
                console.error(error);
            }
        }
    };

    // Injecter une graine
    const handleSeed = async (e) => {
        e.preventDefault();
        if (!seedPuuid.trim()) return;

        try {
            const res = await axios.post('http://localhost:8000/api/v1/crawler/seed', { puuid: seedPuuid.trim() });
            setStatusMessage(res.data.message);
            setSeedPuuid('');
        } catch (error) {
            setStatusMessage("Erreur lors de l'injection de la graine.");
            console.error(error);
        }
    };

    return (
        <div className="min-h-screen bg-app p-8 text-gray-100 font-sans">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header et Contrôles Principaux */}
                <div className="flex items-center justify-between border-b border-border-glass pb-4">
                    <div className="flex items-center gap-3">
                        <Activity className={`w-8 h-8 ${metrics.is_active ? 'text-lol-gold animate-pulse' : 'text-lol-textMuted'}`} />
                        <h1 className="text-2xl font-bold uppercase tracking-wider text-lol-gold">
                            Nexus Big Data
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 text-sm font-bold rounded-full border ${metrics.is_active ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-red-900/30 border-red-500 text-red-400'}`}>
                            {metrics.is_active ? 'EN COURS D\'INGESTION' : 'EN PAUSE'}
                        </span>

                        <button
                            onClick={handlePurge}
                            className="flex items-center gap-2 px-4 py-2 rounded font-bold transition-all bg-surface-elevated text-lol-loss border border-lol-loss/50 hover:bg-lol-loss hover:text-white"
                            title="Vider les files d'attente"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>

                        <button
                            onClick={handleToggle}
                            className={`flex items-center gap-2 px-6 py-2 rounded font-bold transition-all shadow-lg ${metrics.is_active ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-lol-gold hover:bg-lol-goldHover text-app'}`}
                        >
                            {metrics.is_active ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                            {metrics.is_active ? 'Interrompre' : 'Démarrer le Crawler'}
                        </button>
                    </div>
                </div>

                {/* Message de statut */}
                {statusMessage && (
                    <div className="bg-surface-elevated border border-lol-gold/30 text-lol-gold px-4 py-3 rounded">
                        {statusMessage}
                    </div>
                )}

                {/* Panneau de contrôle : Mode d'Ingestion (3 vitesses) */}
                <div className="glass-panel p-6 flex flex-col gap-4 bg-surface-solid border border-border-glass">
                    <div>
                        <h3 className="font-bold text-gray-100 flex items-center gap-2 mb-2">
                            <Filter className="w-5 h-5 text-lol-gold" />
                            Vitesse et Cible d'Ingestion
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Option 1 : Boule de neige (Défaut) */}
                        <button
                            onClick={() => handleSetMode("DISCOVERY_AND_DETAILS")}
                            className={`p-4 rounded border text-left transition-all ${metrics.crawler_mode === 'DISCOVERY_AND_DETAILS' ? 'bg-lol-gold/10 border-lol-gold text-lol-gold' : 'bg-surface-elevated border-border-strong text-gray-400 hover:border-gray-500'}`}
                        >
                            <div className="font-bold mb-1">Exploration Complète</div>
                            <div className="text-xs opacity-80">Découvre de nouveaux joueurs et télécharge les détails des matchs. (Snowballing)</div>
                        </button>

                        {/* Option 2 : Bridé */}
                        <button
                            onClick={() => handleSetMode("DETAILS_ONLY")}
                            className={`p-4 rounded border text-left transition-all ${metrics.crawler_mode === 'DETAILS_ONLY' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-surface-elevated border-border-strong text-gray-400 hover:border-gray-500'}`}
                        >
                            <div className="font-bold mb-1">Bridé (Détails Seulement)</div>
                            <div className="text-xs opacity-80">Dépile les matchs existants dans la file d'attente sans découvrir de nouveaux joueurs.</div>
                        </button>

                        {/* Option 3 : Rattrapage Timelines */}
                        <button
                            onClick={() => handleSetMode("TIMELINES_ONLY")}
                            className={`p-4 rounded border text-left transition-all ${metrics.crawler_mode === 'TIMELINES_ONLY' ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-surface-elevated border-border-strong text-gray-400 hover:border-gray-500'}`}
                        >
                            <div className="font-bold mb-1">Rattrapage Timelines</div>
                            <div className="text-xs opacity-80">Ignore les files. Scanne la base et télécharge les timelines manquantes pour extraire les métriques à 15 min.</div>
                        </button>
                    </div>
                </div>

                {/* Métriques */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="glass-panel p-6 flex flex-col items-center justify-center text-center">
                        <Database className="w-8 h-8 text-blue-400 mb-2" />
                        <span className="text-4xl font-bold text-gray-100">{metrics.total_crawled}</span>
                        <span className="text-xs text-lol-textMuted uppercase mt-1">Matchs Ingérés</span>
                    </div>

                    <div className="glass-panel p-6 flex flex-col items-center justify-center text-center">
                        <Server className="w-8 h-8 text-purple-400 mb-2" />
                        <span className="text-4xl font-bold text-gray-100">{metrics.total_requests}</span>
                        <span className="text-xs text-lol-textMuted uppercase mt-1">Requêtes API Riot</span>
                    </div>

                    <div className="glass-panel p-6 flex flex-col items-center justify-center text-center border-t-4 border-t-yellow-500/50">
                        <PlayCircle className="w-8 h-8 text-yellow-500 mb-2" />
                        <span className="text-4xl font-bold text-gray-100">{metrics.matches_pending}</span>
                        <span className="text-xs text-lol-textMuted uppercase mt-1">Matchs en attente</span>
                    </div>

                    <div className="glass-panel p-6 flex flex-col items-center justify-center text-center border-t-4 border-t-green-500/50">
                        <Users className="w-8 h-8 text-green-500 mb-2" />
                        <span className="text-4xl font-bold text-gray-100">{metrics.players_pending}</span>
                        <span className="text-xs text-lol-textMuted uppercase mt-1">Joueurs à explorer</span>
                    </div>
                </div>

                {/* Amorçage */}
                <div className="glass-panel p-6 mt-8">
                    <h2 className="text-lg font-bold text-lol-gold mb-4 border-b border-border-glass pb-2">Amorçage Manuel</h2>
                    <form onSubmit={handleSeed} className="flex gap-4">
                        <input
                            type="text"
                            placeholder="Entrez un PUUID valide..."
                            value={seedPuuid}
                            onChange={(e) => setSeedPuuid(e.target.value)}
                            className="flex-1 bg-surface-solid text-gray-100 px-4 py-2 outline-none border border-border-strong focus:border-lol-gold rounded font-mono text-sm"
                        />
                        <button
                            type="submit"
                            disabled={!seedPuuid.trim()}
                            className="bg-surface-elevated text-lol-gold border border-lol-gold/50 px-6 py-2 rounded font-bold hover:bg-lol-gold hover:text-app disabled:opacity-50"
                        >
                            Injecter la graine
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
};

export default CrawlerDashboard;