/**
 * ============================================================================
 * FICHIER : frontend/src/components/history/support/SupportVisionView.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Conteneur assemblant les composants experts de la catégorie Vision.
 * Il est injecté dans le Hub Central par l'orchestrateur de rôle.
 * ============================================================================
 */

import React from 'react';
import SupportVisionSummary from './SupportVisionSummary.jsx';
import SupportVisionCoverage from './SupportVisionCoverage.jsx';
import SupportVisionChart from './SupportVisionChart.jsx';

const SupportVisionView = ({ analysisData }) => {
    if (!analysisData) return null;

    return (
        <div className="flex flex-col gap-2 w-full">
            <SupportVisionSummary summary={analysisData.summary} />
            <SupportVisionCoverage coverageRatio={analysisData.summary.controlWardCoverage} />
            <SupportVisionChart chartData={analysisData.chartData} />
        </div>
    );
};

export default SupportVisionView;