/**
 * ============================================================================
 * FICHIER : frontend/scripts/generate_metrics_dict.js
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Script Node.js utilitaire exécuté en ligne de commande pour parser le registre 
 * des métriques (metricsRegistry.js) et générer automatiquement un document 
 * Markdown (METRICS_DICTIONARY.md).
 * * UTILITE :
 * Ce document généré sert de contexte strict aux assistants IA (LLM) 
 * lors de la demande de création de nouvelles vues d'analyse de rôles. 
 * Il garantit qu'aucune métrique n'est inventée ou dupliquée, figeant la 
 * "Single Source of Truth" dans les prompts.
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Importation directe du dictionnaire (nécessite l'extension .js en ESM)
import { METRICS, TIMELINE_SERIES } from '../src/core/configs/metricsRegistry.js';

// Résolution des chemins absolus dans un contexte ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputPath = path.join(__dirname, '../METRICS_DICTIONARY.md');

const generateMarkdown = () => {
    let markdown = `# Dictionnaire des Métriques (JungleDiff)\n\n`;
    markdown += `> **Document auto-généré.** Ce fichier est la référence absolue (Single Source of Truth) pour la création de nouveaux layouts d'analyse de rôles.\n`;
    markdown += `> **Directive IA :** Tu dois impérativement utiliser les constantes \`METRICS.X\` ou \`TIMELINE_SERIES.X\` répertoriées ci-dessous. Interdiction d'inventer des clés non documentées.\n\n`;

    markdown += `## 1. Métriques Générales (METRICS)\n\n`;
    markdown += `| Constante | Clé Backend | Label par défaut | Widget par défaut |\n`;
    markdown += `|---|---|---|---|\n`;

    for (const [key, config] of Object.entries(METRICS)) {
        const valueKey = config.valueKey || 'N/A';
        const defaultLabel = config.defaultLabel || 'N/A';
        const defaultWidget = config.defaultWidget || 'N/A';
        markdown += `| \`METRICS.${key}\` | \`${valueKey}\` | ${defaultLabel} | ${defaultWidget} |\n`;
    }

    markdown += `\n## 2. Séries Temporelles (TIMELINE_SERIES)\n\n`;
    markdown += `| Constante | Clé de Donnée (dataKey) | Nom de courbe par défaut |\n`;
    markdown += `|---|---|---|\n`;

    for (const [key, config] of Object.entries(TIMELINE_SERIES)) {
        const dataKey = config.dataKey || 'N/A';
        const defaultName = config.defaultName || 'N/A';
        markdown += `| \`TIMELINE_SERIES.${key}\` | \`${dataKey}\` | ${defaultName} |\n`;
    }

    return markdown;
};

try {
    const markdownContent = generateMarkdown();
    fs.writeFileSync(outputPath, markdownContent, 'utf8');
    console.log(`[SUCCES] Dictionnaire genere avec succes dans : ${outputPath}`);
} catch (error) {
    console.error(`[ERREUR] Impossible de generer le dictionnaire :`, error);
    process.exit(1);
}