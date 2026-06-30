/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/roles/support/SupportVisionView.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Conteneur assemblant les composants experts de la catégorie Vision.
 * Architecture atomique restaurée, propre et déléguant les responsabilités.
 * ============================================================================
 */

import React from 'react';
import SupportVisionSummary from './SupportVisionSummary.jsx';
import SupportVisionCoverage from './SupportVisionCoverage.jsx';
import SupportVisionChart from './SupportVisionChart.jsx';

const SupportVisionView = ({ data }) => {
    if (!data) return null;

    return (
        <div className="flex flex-col gap-4 mt-2 w-full animate-in fade-in zoom-in-95 duration-200">
            {/* LIGNE 1 : RÉSUMÉ ET JAUGES */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                    <SupportVisionSummary data={data} />
                </div>
                <div className="lg:col-span-1">
                    <SupportVisionCoverage data={data} />
                </div>
            </div>

            {/* LIGNE 2 : GRAPHIQUE TEMPOREL */}
            <SupportVisionChart chartData={data.timelineGraph?.events} />
        </div>
    );
};

export default SupportVisionView;