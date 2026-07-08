/**
 * ============================================================================
 * FICHIER : frontend/src/core/utils/dataUtils.js
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Contient les utilitaires de manipulation structurelle des objets de données
 * complexes provenant de l'API backend.
 * ============================================================================
 */

/**
 * Parcourt un objet de manière récursive pour extraire une valeur à partir d'un chemin.
 * Permet d'utiliser des chemins imbriqués (ex: 'timelineGraph.events') directement 
 * depuis le dictionnaire statique de configuration de layout sans faire crasher
 * l'application si un noeud intermédiaire est manquant.
 * * @param {Object} obj - L'objet de données source (ex: tabs_data.combat)
 * @param {string} path - Le chemin sous forme de chaîne de caractères (ex: "a.b.c")
 * @returns {*} La valeur extraite ou undefined si le chemin est invalide.
 */
export const getNestedValue = (obj, path) => {
    if (!path || !obj) return undefined;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

/**
 * Assainit les données temporelles pour le graphique de combat.
 * Filtre les données brutes pour isoler les achats d'objets majeurs et génère 
 * les valeurs nécessaires au tracé d'une droite de tendance continue entre le début,
 * les achats d'objets, et la fin de la partie.
 * * @param {Array} graphData - Les données brutes de la timeline extraites du backend.
 * @returns {Array} Le tableau enrichi avec la clé conditionnelle 'trendDamage'.
 */
export const prepareTimelineData = (graphData) => {
    if (!graphData || !Array.isArray(graphData)) return [];
    return graphData.map((point, index) => {
        const isFirst = index === 0;
        const isLast = index === graphData.length - 1;
        const hasItem = point.itemIds && point.itemIds.length > 0;

        return {
            ...point,
            trendDamage: (isFirst || isLast || hasItem) ? point.totalDamage : null
        };
    });
};