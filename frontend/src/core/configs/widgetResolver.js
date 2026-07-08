/**
 * ============================================================================
 * FICHIER : frontend/src/core/configs/widgetResolver.js
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Middleware de standardisation stricte pour la View Factory.
 * Fusionne la configuration brute issue d'un layout avec le registre des métriques.
 * ============================================================================
 */

export const resolveWidgetConfig = (rawItem) => {
    const usesRegistry = rawItem.metric
        || rawItem.row1Metric
        || (rawItem.listItems && rawItem.listItems.some(li => li.metric))
        || (rawItem.lines && rawItem.lines.some(l => l.metric));

    if (!usesRegistry) {
        console.error(`[JungleDiff Strict Mode] Violation d'architecture détectée.`, rawItem);
        return null;
    }

    const resolved = { ...rawItem };

    if (rawItem.metric) {
        resolved.widget = rawItem.widget || rawItem.metric.defaultWidget;
        resolved.title = rawItem.override?.label || rawItem.metric.defaultLabel || rawItem.title;
        resolved.label = rawItem.override?.label || rawItem.metric.defaultLabel || rawItem.label;
        resolved.valueKey = rawItem.metric.valueKey || rawItem.valueKey;
        resolved.opponentValueKey = rawItem.metric.opponentValueKey || rawItem.opponentValueKey;
        resolved.format = rawItem.metric.format || rawItem.format;
        resolved.color = rawItem.override?.color || rawItem.metric.color || rawItem.color;
        resolved.bottomText = rawItem.override?.description || rawItem.metric.description || rawItem.bottomText;
        resolved.polarity = rawItem.metric.polarity || rawItem.polarity;

        if (resolved.widget === 'StatCardMain') {
            resolved.mainValueKey = rawItem.metric.valueKey || rawItem.mainValueKey;
            resolved.mainFormat = rawItem.metric.format || rawItem.mainFormat;

            const fMetric = rawItem.footerMetric || rawItem.metric.defaultFooter;
            if (fMetric) {
                resolved.footerLabel = rawItem.override?.footerLabel || fMetric.label || fMetric.defaultLabel || rawItem.footerLabel;
                resolved.footerValueKey = fMetric.valueKey || rawItem.footerValueKey;
                resolved.footerFormat = fMetric.format || rawItem.footerFormat;
            }
        }
    }

    if (rawItem.row1Metric) {
        resolved.row1Label = rawItem.row1Override?.label || rawItem.row1Metric.defaultLabel || rawItem.row1Label;
        resolved.row1ValueKey = rawItem.row1Metric.valueKey || rawItem.row1ValueKey;
        resolved.row1Color = rawItem.row1Override?.color || rawItem.row1Metric.color || rawItem.row1Color;
        resolved.row1Format = rawItem.row1Override?.format || rawItem.row1Metric.format || rawItem.row1Format;
    }
    if (rawItem.row2Metric) {
        resolved.row2Label = rawItem.row2Override?.label || rawItem.row2Metric.defaultLabel || rawItem.row2Label;
        resolved.row2ValueKey = rawItem.row2Metric.valueKey || rawItem.row2ValueKey;
        resolved.row2Color = rawItem.row2Override?.color || rawItem.row2Metric.color || rawItem.row2Color;
        resolved.row2Format = rawItem.row2Override?.format || rawItem.row2Metric.format || rawItem.row2Format;
    }

    if (rawItem.listItems) {
        resolved.listItems = rawItem.listItems.map(li => {
            if (li.metric) {
                return {
                    ...li,
                    label: li.override?.label || li.metric.defaultLabel || li.label,
                    valueKey: li.metric.valueKey || li.valueKey,
                    color: li.override?.color || li.metric.color || li.color
                };
            }
            return li;
        });
    }

    if (rawItem.lines) {
        resolved.lines = rawItem.lines.map(line => {
            if (line.metric) {
                return {
                    ...line.metric, // Hérite de TOUTES les propriétés de la métrique (notamment 'type: stepAfter')
                    ...line,        // Laisse le layout écraser si besoin
                    name: line.override?.name || line.metric.defaultName || line.name,
                    dataKey: line.metric.dataKey || line.dataKey,
                    color: line.override?.color || line.metric.color || line.color
                };
            }
            return line;
        });
    }

    return resolved;
};