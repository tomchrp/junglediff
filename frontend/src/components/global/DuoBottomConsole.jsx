/**
 * ============================================================================
 * FICHIER : frontend/src/components/global/DuoBottomConsole.jsx
 * ============================================================================
 * MODIFICATIONS (Phase 3.5) :
 * - Le composant est dégradé en simple contrôleur logique.
 * - Tout l'affichage redondant est délégué à la primitive DetailConsole.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DetailConsole from '../ui/DetailConsole.jsx';
import UniversalTimelineChart from '../ui/charts/UniversalTimelineChart.jsx';

const CustomDuoTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-surface-solid border border-border-strong rounded shadow-lg p-3 text-xs min-w-[200px] z-50">
                <p className="font-bold text-gray-200 mb-2 pb-1 border-b border-border-glass">
                    Autour de {label} minutes
                </p>
                <div className="flex flex-col gap-2">
                    <div>
                        <p className="text-lol-gold font-bold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-lol-gold inline-block"></span>
                            Winrate du Duo : {data.winrate}%
                        </p>
                        <p className="text-gray-400 pl-4 mt-0.5">({data.matches.toLocaleString()} parties analysées)</p>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const DuoBottomConsole = ({ duo, onClose, versionDDragon, championMap, primaryLane }) => {
    const [timeline, setTimeline] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

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
                const response = await axios.get('http://localhost:8000/api/v1/global-duos/timeline', {
                    params: { champ_a: duo.champ_a, lane_a: duo.lane_a, champ_b: duo.champ_b, lane_b: duo.lane_b }
                });

                const formatted = response.data.map(item => ({
                    bucket: item.duration_bucket,
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
        <DetailConsole
            onClose={onClose}
            leftAvatar={srcLeft}
            rightAvatar={srcRight}
            title={`${champNameLeft} ${leftLane} AVEC ${champNameRight} ${rightLane}`}
            subtitle="Analyse temporelle des Power Spikes du duo"
            isLoading={isLoading}
        >
            <UniversalTimelineChart
                height="h-full"
                data={timeline}
                xAxisKey="bucket"
                formatXAxis={(val) => `${val}m`}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                customTooltip={<CustomDuoTooltip />}
                yAxisConfig={{
                    domain: ['auto', 'auto'],
                    tickFormatter: (value) => `${value}%`
                }}
                lines={[
                    {
                        name: "Winrate",
                        dataKey: "winrate",
                        color: "#c89b3c",
                        strokeWidth: 3,
                        dot: { r: 4, fill: '#C89B3C', stroke: '#111', strokeWidth: 2 },
                        activeDot: { r: 6, fill: '#fff' }
                    }
                ]}
            />
        </DetailConsole>
    );
};

export default DuoBottomConsole;