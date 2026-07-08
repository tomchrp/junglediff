/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/roles/shared/DynamicExpertView.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Itérateur de layout (Phase 4 Refacto).
 * Parcourt un schéma JSON de disposition (grilles, lignes) et assemble les widgets.
 * * MODIFICATIONS :
 * - Purge complète du switch d'instanciation massif.
 * - Le composant ne gère plus que le maillage CSS (grille) et délègue le rendu
 * interne au nouveau composant WidgetRenderer.
 * ============================================================================
 */
import React from 'react';
import WidgetRenderer from './WidgetRenderer.jsx';

export default function DynamicExpertView({ layout, data, versionDDragon, isMismatch = false }) {
    if (!data || !layout) return null;

    /**
     * Dictionnaire statique indispensable pour Tailwind CSS.
     * Empêche l'élimination des classes dynamiques lors du build de l'application
     * pour garantir que les grilles se forment correctement à la volée.
     */
    const gridColsMap = {
        1: 'lg:grid-cols-1',
        2: 'lg:grid-cols-2',
        3: 'lg:grid-cols-3',
        4: 'lg:grid-cols-4'
    };

    return (
        <div className="flex flex-col gap-4 mt-2 w-full animate-in fade-in zoom-in-95 duration-200">
            {layout.map((row, rowIndex) => {
                if (row.type === 'grid') {
                    const lgColsClass = gridColsMap[row.cols] || 'lg:grid-cols-1';
                    return (
                        <div key={`row-${rowIndex}`} className={`grid grid-cols-1 ${lgColsClass} gap-4`}>
                            {row.items.map((item, idx) => (
                                <WidgetRenderer
                                    key={idx}
                                    rawItem={item}
                                    data={data}
                                    versionDDragon={versionDDragon}
                                    isMismatch={isMismatch}
                                />
                            ))}
                        </div>
                    );
                }
                if (row.type === 'row') {
                    return (
                        <React.Fragment key={`row-${rowIndex}`}>
                            {row.items.map((item, idx) => (
                                <WidgetRenderer
                                    key={idx}
                                    rawItem={item}
                                    data={data}
                                    versionDDragon={versionDDragon}
                                    isMismatch={isMismatch}
                                />
                            ))}
                        </React.Fragment>
                    );
                }
                return null;
            })}
        </div>
    );
}