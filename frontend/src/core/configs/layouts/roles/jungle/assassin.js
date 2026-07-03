import { METRICS } from '../../../metricsRegistry';
import { jungleVisionLayout } from '../../shared/denialVisionLayouts';

export const assassinLayout = {
    combat: [
        {
            type: 'grid', cols: 4, items: [
                { metric: METRICS.DAMAGE_TO_CHAMPIONS },
                { metric: METRICS.KILL_PARTICIPATION },
                { metric: METRICS.EARLY_GANKS },
                {
                    widget: 'StatCardDouble',
                    title: 'Utilité au Combat',
                    row1Metric: METRICS.CC_TIME,
                    row2Metric: METRICS.CONTESTED_KILLS
                }
            ]
        }
    ],
    objectives: [
        {
            type: 'grid', cols: 4, items: [
                { metric: METRICS.SCUTTLES },
                { metric: METRICS.EPIC_STEALS },
                { metric: METRICS.EARLY_OBJECTIVES },
                { metric: METRICS.DAMAGE_TO_EPIC }
            ]
        },
        {
            type: 'grid', cols: 2, items: [
                { metric: METRICS.DRAGON_KILLS },
                { metric: METRICS.BARON_KILLS }
            ]
        }
    ],
    resources: [
        {
            type: 'grid', cols: 4, items: [
                { metric: METRICS.ALLY_JUNGLE_CS },
                {
                    widget: 'StatCardDouble',
                    title: 'Invasion',
                    row1Metric: METRICS.ENEMY_JUNGLE_CS,
                    row2Metric: METRICS.BUFFS_STOLEN
                },
                { metric: METRICS.GOLD_EARNED },
                {
                    widget: 'StatCardDouble',
                    title: 'Rythme (<10m)',
                    row1Metric: METRICS.EARLY_GOLD,
                    row2Metric: METRICS.EARLY_XP
                }
            ]
        }
    ],
    vision: jungleVisionLayout
};