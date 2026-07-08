/**
 * ============================================================================
 * FICHIER : frontend/src/components/layouts/SplitDataViewLayout.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Composant structurel de haut niveau gérant une disposition Master / Detail.
 * S'occupe exclusivement de la grille flexbox, des transitions de redimensionnement
 * et de l'animation d'entrée du tiroir de détail (Bottom Console).
 * ============================================================================
 */
import React from 'react';

export default function SplitDataViewLayout({
    masterContent,
    detailContent,
    isDetailOpen,
    masterContainerClassName = "",
    detailContainerClassName = ""
}) {
    return (
        <div className="flex-1 flex flex-col relative overflow-hidden gap-4 min-h-0 w-full">
            {/* Vue Principale (Tableau, Grille, Liste) */}
            <div className={`transition-all duration-300 min-h-0 flex flex-col relative w-full ${isDetailOpen ? 'basis-1/2 shrink-0' : 'basis-full'} ${masterContainerClassName}`}>
                {masterContent}
            </div>

            {/* Tiroir de Détail (Graphiques, Console d'analyse) */}
            {isDetailOpen && (
                <div className={`basis-1/2 min-h-0 flex flex-col animate-in slide-in-from-bottom-4 ${detailContainerClassName}`}>
                    {detailContent}
                </div>
            )}
        </div>
    );
}