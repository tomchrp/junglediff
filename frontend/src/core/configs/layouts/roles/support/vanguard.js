import { METRICS, TIMELINE_SERIES } from '../../../metricsRegistry';
import { supportVisionLayout } from '../../shared/controlVisionLayouts';

export const vanguardLayout = {
    vision: supportVisionLayout,
    combat: [
        {
            type: 'grid', cols: 3, items: [
                { metric: METRICS.DAMAGE_MITIGATED },
                { metric: METRICS.TEAM_DEFENSE_SHARE },
                { metric: METRICS.KILL_PARTICIPATION }
            ]
        },
        {
            type: 'row', items: [
                {
                    widget: 'AdvancedTimelineChart',
                    title: "Évolution de l'encaissement",
                    dataKey: 'timelineGraph.damage_graph',
                    xAxisKey: 'timestamp',
                    lines: [
                        { metric: TIMELINE_SERIES.TREND_DAMAGE, connectNulls: true, type: 'linear' },
                        { metric: TIMELINE_SERIES.TOTAL_DAMAGE, dotRenderer: 'CustomItemDot' }
                    ]
                }
            ]
        },
        {
            type: 'grid', cols: 3, items: [
                { metric: METRICS.TIME_CCING_OTHERS },
                {
                    widget: 'StatCardDouble',
                    title: "Qualité d'Engagement",
                    row1Metric: METRICS.ENEMY_IMMOBILIZATIONS,
                    row2Metric: METRICS.IMMOBILIZE_AND_KILL
                },
                { metric: METRICS.SURVIVED_BURSTS }
            ]
        }
    ]
};