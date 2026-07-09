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
        app: '#050505',
        surface: {
          DEFAULT: 'rgba(18, 18, 18, 0.6)',
          elevated: 'rgba(38, 38, 38, 0.8)',
          solid: '#121212',
        },
        border: {
          glass: 'rgba(255, 255, 255, 0.06)',
          strong: 'rgba(255, 255, 255, 0.15)',
        },
        lol: {
          gold: '#c8aa6e',
          goldHover: '#f0e6d2',
          win: '#0ea5e9',    // Bleu Cyan classique LoL
          loss: '#f87171',   // Rouge sourd
          info: '#38bdf8',
          textMuted: '#94a3b8'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 12px 40px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        'glass-elevated': '0 20px 50px 0 rgba(0, 0, 0, 0.8), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
        'glow-gold': '0 0 15px rgba(200, 170, 110, 0.2)',

        // Liseré strict sur la gauche, incrusté, sans aucun flou
        'glow-win': 'inset 3px 0 0 0 rgba(14, 165, 233, 0.9)',
        'glow-loss': 'inset 3px 0 0 0 rgba(248, 113, 113, 0.9)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        ambientDrift: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(2%, -2%) scale(1.05)' },
          '66%': { transform: 'translate(-2%, 2%) scale(0.95)' },
        },
        ambientPulse: {
          '0%, 100%': { opacity: '0.05' },
          '50%': { opacity: '0.08' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      animation: {
        'shimmer': 'shimmer 2s infinite',
        'ambient-drift': 'ambientDrift 20s ease-in-out infinite',
        'ambient-pulse': 'ambientPulse 15s ease-in-out infinite',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
      }
    },
  },
  plugins: [],
}