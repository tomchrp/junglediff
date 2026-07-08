/**
 * ============================================================================
 * FICHIER : frontend/src/components/ui/JunglePathingMap.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Primitive visuelle (Design System) affichant la minimap de la Faille de l'Invocateur.
 * Ce composant trace les routes de jungle (First Clear) en utilisant les 
 * coordonnées spatiales extraites par le backend.
 * * MODIFICATIONS :
 * - Suppression totale de l'état interne : Le composant devient "Dumb" et obéit 
 * exclusivement à la prop `activeTeam` fournie par App.jsx.
 * - Refonte de l'extracteur de frames : Une fonction `getValidPoints` extrait 
 * désormais dynamiquement toutes les frames valides, empêchant le plantage
 * silencieux si le backend renvoie un JSON incomplet.
 * ============================================================================
 */

import React, { useMemo } from 'react';

// Constante officielle de la taille de la Faille de l'Invocateur (Match V5)
const MAP_MAX = 14820;

/**
 * Extrait dynamiquement les frames de coordonnées valides d'un chemin, 
 * peu importe leur nombre ou leur nom exact (f1, f2, etc.).
 * @param {Object} path - L'objet contenant les points de cheminement.
 * @returns {Array} Un tableau de coordonnées {x, y} valides.
 */
const getValidPoints = (path) => {
    const points = [];
    // On itère sur un nombre suffisant de frames potentielles
    for (let i = 1; i <= 10; i++) {
        const frame = path[`f${i}`];
        if (frame && frame.x != null && frame.y != null) {
            points.push(frame);
        }
    }
    return points;
};

const JunglePathingMap = ({ data, activeTeam }) => {
    // Normalisation : garantit que l'on manipule toujours un tableau, 
    // même si le backend n'envoie qu'un seul objet pour une partie unique.
    const rawPaths = useMemo(() => {
        if (!data) return [];
        return Array.isArray(data) ? data : [data];
    }, [data]);

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
                        const points = getValidPoints(path);
                        // On a besoin d'au moins 2 points pour tracer une ligne
                        if (points.length < 2) return null;

                        const strokeColor = isBlueSide ? '#3b82f6' : '#ef4444'; // blue-500 ou red-500
                        const lines = [];

                        for (let i = 0; i < points.length - 1; i++) {
                            const p1 = points[i];
                            const p2 = points[i + 1];
                            lines.push(
                                <line
                                    key={`line-${idx}-${i}`}
                                    x1={`${toPercentX(p1.x)}%`} y1={`${toPercentY(p1.y)}%`}
                                    x2={`${toPercentX(p2.x)}%`} y2={`${toPercentY(p2.y)}%`}
                                    stroke={strokeColor}
                                    strokeWidth="2"
                                    strokeDasharray="4 4"
                                    opacity="0.8"
                                />
                            );
                        }

                        return <g key={`lines-${idx}`}>{lines}</g>;
                    })}
                </svg>

                {/* Couche HTML (Badges temporels) */}
                {filteredPaths.map((path, idx) => {
                    const points = getValidPoints(path);
                    if (points.length === 0) return null;

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