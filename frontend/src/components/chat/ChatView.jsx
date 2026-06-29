/**
 * ============================================================================
 * FICHIER : frontend/src/components/chat/ChatView.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Vue globale dédiée à l'analyse conversationnelle. Charge de manière
 * autonome l'historique récent du joueur pour hydrater son sélecteur de 
 * contexte (match_id), puis délègue le streaming au composant ChatBox.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ChatBox from './ChatBox';

export default function ChatView({ puuid }) {
    const [selectedMatchId, setSelectedMatchId] = useState("");
    const [localMatches, setLocalMatches] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRecentMatches = async () => {
            if (!puuid) return;
            setIsLoading(true);
            try {
                const response = await axios.get(`http://localhost:8000/api/v1/matches/${puuid}/history?limit=15`);
                const fetchedMatches = response.data.matches || [];
                setLocalMatches(fetchedMatches);

                if (fetchedMatches.length > 0) {
                    // Sécurisation de la récupération de l'ID selon le format DB
                    const firstMatchId = fetchedMatches[0].matchId || fetchedMatches[0].metadata?.matchId;
                    setSelectedMatchId(firstMatchId);
                }
            } catch (error) {
                console.error("Erreur lors de la récupération des matchs pour l'IA:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecentMatches();
    }, [puuid]);

    if (!puuid) {
        return (
            <div className="glass-panel p-8 text-center text-lol-textMuted">
                Veuillez d'abord rechercher un joueur pour utiliser l'assistant IA.
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="glass-panel p-8 text-center text-lol-textMuted">
                Chargement du contexte analytique...
            </div>
        );
    }

    if (!localMatches || localMatches.length === 0) {
        return (
            <div className="glass-panel p-8 text-center text-lol-textMuted">
                Aucune partie chargée. Veuillez actualiser l'historique.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="glass-panel p-4 flex items-center justify-between">
                <div className="flex flex-col">
                    <h2 className="text-lg font-bold text-white uppercase tracking-wide">Analyse Assistée</h2>
                    <p className="text-xs text-lol-textMuted">Interrogez le modèle sur vos statistiques de partie.</p>
                </div>

                <div className="flex items-center gap-3">
                    <label htmlFor="match-selector" className="text-sm font-semibold text-white/70">
                        Contexte de l'analyse :
                    </label>
                    <select
                        id="match-selector"
                        value={selectedMatchId}
                        onChange={(e) => setSelectedMatchId(e.target.value)}
                        className="bg-surface-elevated text-white border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-lol-gold max-w-md truncate"
                    >
                        {localMatches.map((match, index) => {
                            // Extraction ultra-blindée (Optional Chaining) pour éviter tout crash
                            const matchId = match?.match_id || match?.matchId || `ID_INCONNU_${index}`;

                            const timestamp = match?.creation_timestamp || match?.gameCreation || match?.info?.gameCreation;
                            const dateStr = timestamp
                                ? new Date(timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                                : "Date inconnue";

                            // Recherche de la stat de victoire selon l'aplatissement de ton repository
                            const isWin = match?.win ?? match?.participants?.[0]?.win ?? false;
                            const resultText = isWin ? "Victoire" : "Défaite";

                            const championName = match?.championName ?? match?.participants?.[0]?.championName ?? "Champion";

                            return (
                                <option key={matchId} value={matchId}>
                                    {dateStr} - {championName} ({resultText})
                                </option>
                            );
                        })}
                    </select>
                </div>
            </div>

            <div className="glass-panel flex-1 p-4 overflow-hidden flex flex-col min-h-0">
                <ChatBox puuid={puuid} matchId={selectedMatchId} />
            </div>
        </div>
    );
}