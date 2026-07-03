/**
 * ============================================================================
 * FICHIER : frontend/src/main.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Point d'entrée React de l'application.
 * Instancie le DOM virtuel et enveloppe l'application dans le BrowserRouter 
 * pour activer le routage par URL. Les routes paramétrées sont définies ici 
 * pour capturer la vue, le serveur et le Riot ID.
 * Intègre la route d'administration protégée du Crawler Big Data.
 * ============================================================================
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import CrawlerDashboard from './components/admin/CrawlerDashboard.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Route d'administration cachée */}
        <Route path="/admin/crawler" element={<CrawlerDashboard />} />

        {/* Routes publiques */}
        <Route path="/" element={<App />} />
        <Route path="/:view/:server/:riotId" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);