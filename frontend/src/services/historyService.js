/**
 * ============================================================================
 * FICHIER : frontend/src/services/historyService.js
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Service utilitaire gérant la persistance locale (localStorage) de 
 * l'historique de recherche des profils.
 * Assure un stockage FIFO limité à 5 éléments et gère la déduplication.
 * ============================================================================
 */

const STORAGE_KEY = 'junglediff_recent_profiles';
const MAX_HISTORY = 5;

/**
 * Récupère l'historique des profils stockés.
 * @returns {Array} Tableau d'objets de profils récents.
 */
export const getRecentProfiles = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Erreur lors de la lecture de l'historique local", e);
        return [];
    }
};

/**
 * Ajoute ou met à jour un profil dans l'historique local.
 * Place toujours le profil appelé en tête de liste (récence).
 */
export const addProfileToHistory = (server, gameName, tagLine) => {
    const profiles = getRecentProfiles();
    const id = `${server}-${gameName}-${tagLine}`.toLowerCase();

    const newProfile = {
        id,
        server,
        gameName,
        tagLine,
        timestamp: Date.now()
    };

    // Suppression de l'ancienne occurrence si elle existe pour la replacer en haut
    const filtered = profiles.filter(p => p.id !== id);
    filtered.unshift(newProfile);

    // Maintien de la limite stricte de stockage
    if (filtered.length > MAX_HISTORY) {
        filtered.pop();
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

/**
 * Supprime explicitement un profil de l'historique local.
 * Utilisé par la croix de suppression de la SearchBar.
 */
export const removeProfileFromHistory = (id) => {
    const profiles = getRecentProfiles();
    const filtered = profiles.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};