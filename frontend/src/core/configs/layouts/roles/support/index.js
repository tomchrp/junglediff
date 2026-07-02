/**
 * ============================================================================
 * FICHIER : frontend/src/core/configs/layouts/roles/support/index.js
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Registre de liaison pour le rôle Support.
 * Importe les configurations individuelles des archétypes et les expose 
 * sous forme de dictionnaire clé-valeur.
 * ============================================================================
 */

import { vanguardLayout } from './vanguard';
import { artilleryLayout } from './artillery';

export const supportLayouts = {
    VANGUARD: vanguardLayout,
    ARTILLERY: artilleryLayout
};