/**
 * ============================================================================
 * FICHIER : frontend/src/components/global/DuoBottomConsole.jsx
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Avatar from '../ui/Avatar.jsx';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

const DuoBottomConsole = ({ duo, onClose, versionDDragon, championMap, primaryLane }) => {
    const [timeline, setTimeline] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // CORRECTION : Ancrage du titre
    const isPrimaryA = duo.lane_a === primaryLane;

    const leftChamp = isPrimaryA ? duo.champ_a : duo.champ_b;
    const leftLane = isPrimaryA ? duo.lane_a : duo.lane_b;

    const rightChamp = isPrimaryA ? duo.champ_b : duo.champ_a;
    const rightLane = isPrimaryA ? duo.lane_b : duo.lane_a;

    const champNameLeft = championMap?.[leftChamp] || "Inconnu";
    const champNameRight = championMap?.[rightChamp] || "Inconnu";

    const srcLeft = `https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/champion/${champNameLeft.replace(/\s+/g, '')}.png`;
    const srcRight = `https://ddragon.leagueoflegends.com/cdn/${versionDDragon}/img/champion/${champNameRight.replace(/\s+/g, '')}.png`;

    useEffect(() => {
        const fetchTimeline = async () => {
            setIsLoading(true);
            try {
                // L'ordre d'appel API n'a pas d'importance pour le backend
                const response = await axios.get('http://localhost:8000/api/v1/global-duos/timeline', {
                    params: { champ_a: duo.champ_a, lane_a: duo.lane_a, champ_b: duo.champ_b, lane_b: duo.lane_b }
                });
                const formatted = response.data.map(item => ({
                    time: `${item.duration_bucket}m`,
                    winrate: parseFloat((item.winrate * 100).toFixed(1)),
                    matches: item.total_matches
                }));
                setTimeline(formatted);
            } catch (error) {
                console.error("Erreur API Timeline :", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTimeline();
    }, [duo]);

    return (
        <div className="basis-1/2 min-h-0 flex flex-col glass-panel p-4 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-start shrink-0 border-b border-border-glass pb-3 mb-3">
                <div className="flex items-center gap-4">
                    <div className="flex items-center -space-x-2">
                        <Avatar src={srcLeft} size="base" type="champion" />
                        <Avatar src={srcRight} size="base" type="champion" className="relative z-10" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h3 className="text-lol-gold font-bold text-sm tracking-widest uppercase">
                            {champNameLeft} {leftLane} AVEC {champNameRight} {rightLane}
                        </h3>
                        <p className="text-gray-300 text-xs font-medium">
                            Analyse temporelle des Power Spikes du duo
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-red-400 transition-colors p-1 px-3 rounded hover:bg-white/5 text-lg font-bold"
                    title="Fermer l'analyse"
                >
                    ✕
                </button>
            </div>

            <div className="flex-1 min-h-0">
                {isLoading ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="animate-pulse text-lol-gold text-sm font-bold uppercase tracking-widest">Analyse...</span>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis dataKey="time" stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
                            <YAxis domain={['auto', 'auto']} stroke="#666" tick={{ fill: '#888', fontSize: 10 }} unit="%" />
                            <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
                            <ReferenceLine y={50} stroke="#444" strokeDasharray="3 3" />
                            <Line type="monotone" dataKey="winrate" stroke="#c89b3c" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default DuoBottomConsole;