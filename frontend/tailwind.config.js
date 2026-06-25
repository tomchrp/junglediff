/**
 * ============================================================================
 * FICHIER : frontend/tailwind.config.js
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Fichier de configuration principal de Tailwind CSS.
 * - content : Indique au compilateur les fichiers a analyser pour purger le CSS inutilise.
 * - theme : Etend la palette de couleurs par defaut pour inclure l'identite 
 * visuelle de l'application (le dore pour les bordures, le bleu nuit pour le fond).
 * ============================================================================
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'lol-gold': '#c8aa6e',
        'lol-blue': '#091428',
        'lol-dark': '#010a13',
        'lol-border': '#1e2328'
      }
    },
  },
  plugins: [],
}