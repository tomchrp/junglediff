/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/roles/support/SupportVisionSummary.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Composant affichant les blocs de détails textuels et les scores absolus.
 * Centralise l'utilisation de StatDelta pour garantir une uniformité visuelle.
 * ============================================================================
 */

import React from 'react';
import StatDelta from '../../../ui/StatDelta.jsx';

const SupportVisionSummary = ({ data }) => {

    /**
     * Convertit les millisecondes brutes en format chronomètre (ex: 12:45).
     */
    const formatAxisTime = (ms) => {
        if (!ms) return "N/A";
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col gap-4 h-full justify-between">
            {/* BLOC 1 : SCORE GLOBAL (En-tête) */}
            <div className="bg-surface-solid border border-border-glass rounded-md p-4 flex justify-between items-center h-full">
                <div>
                    <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-1">Score Global</div>
                    <div className="flex items-center gap-3">
                        <span className="text-gray-100 font-bold text-4xl">{data.visionScore}</span>
                        <StatDelta value={data.visionScore} opponentValue={data.visionScoreOpponent} showBackground={true} />
                    </div>
                </div>
                <div className="text-right flex flex-col justify-end h-full">
                    <div className="text-lol-textMuted text-[10px] mb-1 uppercase font-bold tracking-wider">Ratio / minute</div>
                    <div className="flex items-center justify-end gap-2">
                        <span className="text-gray-200 font-bold text-lg">{data.visionScorePerMinute?.toFixed(1)}</span>
                        <StatDelta value={data.visionScorePerMinute} opponentValue={data.visionScorePerMinuteOpponent} type="number" />
                    </div>
                </div>
            </div>

            {/* BLOC 2 : GRILLE DE DÉTAILS */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-surface-solid border border-border-glass rounded-md p-3 text-center flex flex-col justify-center">
                    <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-2">Quête Support</div>
                    <div className="text-gray-100 font-bold text-xl">{formatAxisTime(data.playerQuestTime)}</div>
                    <div className="mt-2">
                        <StatDelta
                            value={data.playerQuestTime}
                            opponentValue={data.oppQuestTime}
                            type="time"
                            polarity="negative"
                            showBackground={true}
                        />
                    </div>
                </div>

                <div className="bg-surface-solid border border-border-glass rounded-md p-3 text-center">
                    <div className="text-lol-textMuted text-[10px] uppercase font-bold tracking-wider mb-2">Détail des Balises</div>
                    <div className="text-gray-200 text-xs flex flex-col gap-1.5 text-left w-full px-2">
                        <div className="flex items-center justify-between">
                            <span>Pinks : <span className="font-bold text-pink-400">{data.controlWardsBought}</span></span>
                            <StatDelta value={data.controlWardsBought} opponentValue={data.controlWardsBoughtOpponent} />
                        </div>
                        <div className="flex items-center justify-between border-t border-border-glass/50 pt-1.5">
                            <span>Posées : <span className="font-bold text-gray-100">{data.wardsPlaced}</span></span>
                            <StatDelta value={data.wardsPlaced} opponentValue={data.wardsPlacedOpponent} />
                        </div>
                        <div className="flex items-center justify-between border-t border-border-glass/50 pt-1.5">
                            <span>Détruites : <span className="font-bold text-gray-100">{data.wardsKilled}</span></span>
                            <StatDelta value={data.wardsKilled} opponentValue={data.wardsKilledOpponent} />
                        </div>
                    </div>
                </div>

                <div className="bg-surface-solid border border-lol-gold/40 rounded-md p-3 text-center flex flex-col justify-center">
                    <div className="text-lol-gold/80 text-[10px] uppercase font-bold tracking-wider mb-2">Setup Objectifs Neutres</div>
                    <div className="text-gray-100 font-bold text-3xl">{data.avgPreObjectiveWards?.toFixed(1)}</div>
                    <div className="text-lol-textMuted text-[9px] mt-2 leading-tight px-2">
                        Wards posées dans les 60s avant la mort d'un monstre épique.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupportVisionSummary;