/**
 * ============================================================================
 * FICHIER : frontend/src/core/configs/layouts/index.js
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Point d'entrée principal des configurations d'interface.
 * Assemble les registres de tous les rôles pour reformer le grand dictionnaire
 * attendu par le RoleAnalysisController.
 * ============================================================================
 */

import { supportLayouts } from './roles/support';
import { jungleLayouts } from './roles/jungle';

export const roleLayouts = {
    SUPPORT: supportLayouts,
    JUNGLE: jungleLayouts
};