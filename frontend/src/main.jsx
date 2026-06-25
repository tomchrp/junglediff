/**
 * ============================================================================
 * FICHIER : frontend/src/main.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Point d'entrée principal de l'application React.
 * Monte le composant racine (App) dans le DOM du navigateur.
 * ============================================================================
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // Importation indispensable pour charger Tailwind CSS

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)