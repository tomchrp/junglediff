/**
 * ============================================================================
 * FICHIER : frontend/src/components/ui/JunglePathingMap.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Primitive visuelle (Design System) affichant la minimap de la Faille de l'Invocateur.
 * Ce composant trace les routes de jungle (First Clear) en utilisant les 
 * coordonnées spatiales extraites par le backend.
 * * FONCTIONNALITÉS :
 * - Accepte un objet unique (une partie) ou un tableau (plusieurs parties).
 * - Bascule (Toggle) intégrée pour filtrer les routes par équipe (Blue/Red side).
 * - Utilisation d'un calque SVG en position absolue garantissant que les lignes
 * pointillées restent parfaitement attachées aux marqueurs peu importe 
 * l'étirement ou la résolution de l'écran.
 * ============================================================================
 */

import React, { useState, useMemo } from 'react';

// Constante officielle de la taille de la Faille de l'Invocateur (Match V5)
const MAP_MAX = 14820;

const JunglePathingMap = ({ data }) => {
    // Normalisation : garantit que l'on manipule toujours un tableau, 
    // même si le backend n'envoie qu'un seul objet pour une partie unique.
    const rawPaths = useMemo(() => {
        if (!data) return [];
        return Array.isArray(data) ? data : [data];
    }, [data]);

    // Déduction de l'équipe majoritaire pour l'état initial du Toggle
    // Si la donnée provient d'un match unique, on pré-sélectionne le camp du joueur.
    const defaultTeam = rawPaths.length > 0 ? rawPaths[0].teamId : 100;
    const [activeTeam, setActiveTeam] = useState(defaultTeam);

    // Filtrage des chemins selon le Toggle actif (100 = Blue, 200 = Red)
    const filteredPaths = useMemo(() => {
        return rawPaths.filter(path => path.teamId === activeTeam);
    }, [rawPaths, activeTeam]);

    /**
     * Convertit la coordonnée X native de Riot en pourcentage CSS horizontal.
     * @param {number} x - Coordonnée X brute (0 à 14820)
     * @returns {number} Pourcentage (0 à 100)
     */
    const toPercentX = (x) => {
        if (x === null || x === undefined) return 0;
        return (x / MAP_MAX) * 100;
    };

    /**
     * Convertit la coordonnée Y native de Riot en pourcentage CSS vertical.
     * ATTENTION : L'origine (0,0) de Riot est en bas à gauche. L'origine SVG/CSS
     * est en haut à gauche. Il faut donc inverser mathématiquement l'axe Y.
     * @param {number} y - Coordonnée Y brute (0 à 14820)
     * @returns {number} Pourcentage inversé (0 à 100)
     */
    const toPercentY = (y) => {
        if (y === null || y === undefined) return 0;
        return 100 - ((y / MAP_MAX) * 100);
    };

    const isBlueSide = activeTeam === 100;

    return (
        <div className="w-full flex flex-col gap-4">
            {/* Contrôles (Toggle) */}
            <div className="flex justify-center gap-2">
                <button
                    onClick={() => setActiveTeam(100)}
                    className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeTeam === 100
                            ? 'bg-blue-600 text-white'
                            : 'bg-surface-solid text-gray-400 hover:text-gray-200'
                        }`}
                >
                    Équipe Bleue
                </button>
                <button
                    onClick={() => setActiveTeam(200)}
                    className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeTeam === 200
                            ? 'bg-red-600 text-white'
                            : 'bg-surface-solid text-gray-400 hover:text-gray-200'
                        }`}
                >
                    Équipe Rouge
                </button>
            </div>

            {/* Conteneur Minimap (Aspect Carré Strict) */}
            <div className="relative w-full max-w-md mx-auto aspect-square bg-black rounded-lg overflow-hidden border border-white/10 shadow-lg">
                {/* Image de fond */}
                <img
                    src="/assets/map/minimap.png"
                    alt="Faille de l'Invocateur"
                    className="absolute inset-0 w-full h-full object-cover opacity-70"
                />

                {/* Couche Vectorielle (Lignes pointillées) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {filteredPaths.map((path, idx) => {
                        // Sécurité : ne pas dessiner si les points sont manquants
                        if (!path.f1?.x || !path.f2?.x || !path.f3?.x) return null;

                        const x1 = toPercentX(path.f1.x);
                        const y1 = toPercentY(path.f1.y);
                        const x2 = toPercentX(path.f2.x);
                        const y2 = toPercentY(path.f2.y);
                        const x3 = toPercentX(path.f3.x);
                        const y3 = toPercentY(path.f3.y);

                        const strokeColor = isBlueSide ? '#3b82f6' : '#ef4444'; // blue-500 ou red-500

                        return (
                            <g key={`lines-${idx}`}>
                                <line
                                    x1={`${x1}%`} y1={`${y1}%`}
                                    x2={`${x2}%`} y2={`${y2}%`}
                                    stroke={strokeColor}
                                    strokeWidth="2"
                                    strokeDasharray="4 4"
                                    opacity="0.8"
                                />
                                <line
                                    x1={`${x2}%`} y1={`${y2}%`}
                                    x2={`${x3}%`} y2={`${y3}%`}
                                    stroke={strokeColor}
                                    strokeWidth="2"
                                    strokeDasharray="4 4"
                                    opacity="0.8"
                                />
                            </g>
                        );
                    })}
                </svg>

                {/* Couche HTML (Badges temporels) */}
                {filteredPaths.map((path, idx) => {
                    if (!path.f1?.x || !path.f2?.x || !path.f3?.x) return null;

                    const points = [path.f1, path.f2, path.f3];
                    const colorClass = isBlueSide ? 'bg-blue-600' : 'bg-red-600';

                    return points.map((pt, ptIdx) => (
                        <div
                            key={`badge-${idx}-${ptIdx}`}
                            className={`absolute w-5 h-5 -ml-2.5 -mt-2.5 flex items-center justify-center rounded-full text-[10px] font-bold text-white border border-white shadow-md ${colorClass}`}
                            style={{
                                left: `${toPercentX(pt.x)}%`,
                                top: `${toPercentY(pt.y)}%`
                            }}
                        >
                            {ptIdx + 1}
                        </div>
                    ));
                })}
            </div>
        </div>
    );
};

export default JunglePathingMap;