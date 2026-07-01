/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/roles/support/SupportVisionView.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Conteneur maître de la vue experte Vision pour le Support.
 * 
 * DESIGN SYSTEM MIS À JOUR :
 * - Suppression des diviseurs internes (border-t) pour épurer les cartes.
 * - Centralisation stricte des cartes à métrique unique.
 * - Maintien de la justification (gauche-droite) pour les cartes de type Liste 
 *   afin de préserver l'ergonomie de lecture.
 * - Repositionnement des statistiques secondaires (ex: Ratio) directement sous 
 *   la donnée primaire, libérant le footer pour le texte purement descriptif.
 * ============================================================================
 */

import React from 'react';
import SupportVisionChart from './SupportVisionChart.jsx';
import StatDelta from '../../../ui/StatDelta.jsx';
import CircularGauge from '../../../ui/CircularGauge.jsx';

const SupportVisionView = ({ data }) => {
    if (!data) return null;

    /**
     * Convertit les millisecondes brutes en format chronomètre (ex: 12:45).
     * @param {number} ms - Temps en millisecondes.
     * @returns {string} Format lisible.
     */
    const formatAxisTime = (ms) => {
        if (!ms) return "N/A";
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col gap-4 mt-2 w-full animate-in fade-in zoom-in-95 duration-200">

            {/* LIGNE 1 : SCORE ET JAUGES */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Carte : Score Global (Centrée) */}
                <div className="bg-surface-solid border border-border-glass rounded-md p-4 flex flex-col items-center text-center h-full">
                    <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-3">
                        Score Global
                    </div>

                    {/* Coeur : Statistique Primaire */}
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <span className="text-gray-100 font-bold text-4xl">{data.visionScore}</span>
                        <StatDelta value={data.visionScore} opponentValue={data.visionScoreOpponent} showBackground={true} />
                    </div>

                    {/* Coeur : Statistique Secondaire repensée */}
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider">Ratio :</span>
                        <span className="text-gray-200 font-bold text-sm">{data.visionScorePerMinute?.toFixed(1)}/m</span>
                        <StatDelta value={data.visionScorePerMinute} opponentValue={data.visionScorePerMinuteOpponent} type="number" showBackground={true} />
                    </div>

                    {/* Footer purement descriptif (si nécessaire, ici laissé vide pour respirer) */}
                    <div className="mt-auto pt-2 text-lol-textMuted text-[10px] uppercase font-bold tracking-wider leading-tight">
                        Impact brut de la vision
                    </div>
                </div>

                <div className="h-full">
                    <CircularGauge
                        label="Part de l'équipe"
                        value={(data.teamVisionShare || 0) * 100}
                        opponentValue={(data.teamVisionShareOpponent || 0) * 100}
                        color="text-lol-info"
                    />
                </div>

                <div className="h-full">
                    <CircularGauge
                        label="Pénétration Offensive"
                        value={(data.controlWardCoverage || 0) * 100}
                        opponentValue={(data.controlWardCoverageOpponent || 0) * 100}
                        color="text-lol-info"
                    />
                </div>
            </div>

            {/* LIGNE 2 : GRAPHIQUE TEMPOREL */}
            <SupportVisionChart chartData={data.timelineGraph?.events} />

            {/* LIGNE 3 : DÉTAILS ET SETUPS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Carte : Quête Support (Centrée) */}
                <div className="bg-surface-solid border border-border-glass rounded-md p-4 flex flex-col items-center text-center h-full">
                    <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-3">
                        Quête Support
                    </div>
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <span className="text-gray-100 font-bold text-3xl">{formatAxisTime(data.playerQuestTime)}</span>
                        <StatDelta value={data.playerQuestTime} opponentValue={data.oppQuestTime} type="time" polarity="negative" showBackground={true} />
                    </div>
                    <div className="mt-auto pt-2 text-lol-textMuted text-[10px] uppercase font-bold tracking-wider leading-tight">
                        Timer d'obtention des balises
                    </div>
                </div>

                {/* Carte : Détail des Balises (Format Liste, Non-centré pour la lisibilité) */}
                <div className="bg-surface-solid border border-border-glass rounded-md p-4 flex flex-col items-center h-full">
                    <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-4 text-center">
                        Détail des Balises
                    </div>
                    <div className="flex flex-col gap-3 flex-1 w-full px-2">
                        <div className="flex justify-between items-center w-full">
                            <span className="text-gray-200 text-xs">Pinks achetées</span>
                            <div className="flex items-center gap-2">
                                <span className="text-pink-400 font-bold">{data.controlWardsBought}</span>
                                <StatDelta value={data.controlWardsBought} opponentValue={data.controlWardsBoughtOpponent} showBackground={true} />
                            </div>
                        </div>
                        <div className="flex justify-between items-center w-full">
                            <span className="text-gray-200 text-xs">Balises posées</span>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-100 font-bold">{data.wardsPlaced}</span>
                                <StatDelta value={data.wardsPlaced} opponentValue={data.wardsPlacedOpponent} showBackground={true} />
                            </div>
                        </div>
                        <div className="flex justify-between items-center w-full">
                            <span className="text-gray-200 text-xs">Balises détruites</span>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-100 font-bold">{data.wardsKilled}</span>
                                <StatDelta value={data.wardsKilled} opponentValue={data.wardsKilledOpponent} showBackground={true} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Carte : Setup Objectifs (Centrée) */}
                <div className="bg-surface-solid border border-border-glass rounded-md p-4 flex flex-col items-center text-center h-full">
                    <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-3">
                        Setup Objectifs Neutres
                    </div>
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <span className="text-gray-100 font-bold text-3xl">{data.avgPreObjectiveWards?.toFixed(1)}</span>
                    </div>
                    <div className="mt-auto pt-2 text-lol-textMuted text-[10px] uppercase font-bold tracking-wider leading-tight">
                        Wards posées 60s avant la mort d'un monstre épique.
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SupportVisionView;