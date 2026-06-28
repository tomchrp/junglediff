/**
 * ============================================================================
 * FICHIER : frontend/tailwind.config.js
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Configuration globale du Design System de l'application.
 * Thème "Dark Data-Viz" : Utilisation de fonds quasi-noirs et de surfaces 
 * neutres pour maximiser le contraste et la lisibilité des statistiques.
 * ============================================================================
 */

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fond absolu de l'application (Quasi-noir pour contraste maximal)
        app: '#050505',

        // Palette des surfaces (Glassmorphism sur base neutre/grise)
        surface: {
          DEFAULT: 'rgba(18, 18, 18, 0.6)',  // État de repos
          elevated: 'rgba(38, 38, 38, 0.8)', // État survolé ou actif
          solid: '#121212',                  // Repli opaque
        },

        // Sémantique des bordures (très subtiles)
        border: {
          glass: 'rgba(255, 255, 255, 0.06)',
          strong: 'rgba(255, 255, 255, 0.12)',
        },

        // Sémantique métier League of Legends
        lol: {
          gold: '#c8aa6e',
          goldHover: '#f0e6d2',
          win: '#4ade80',    // Vert optimisé
          loss: '#f87171',   // Rouge sourd
          info: '#38bdf8',
          textMuted: '#94a3b8' // Texte secondaire
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 12px 40px 0 rgba(0, 0, 0, 0.6)', // Ombre plus forte pour détacher du fond noir
        'glow-gold': '0 0 15px rgba(200, 170, 110, 0.2)', // Glow adouci
      }
    },
  },
  plugins: [],
}