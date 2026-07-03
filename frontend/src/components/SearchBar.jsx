/**
 * ============================================================================
 * FICHIER : frontend/src/components/SearchBar.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Composant de recherche global avec historique intégré.
 * Intercepte la saisie du Riot ID, gère l'affichage du menu déroulant 
 * contenant les profils récents (localStorage) et déclenche la navigation 
 * web via React Router au lieu d'appeler directement l'API.
 * ============================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRecentProfiles, removeProfileFromHistory } from '../services/historyService.js';

const SearchBar = ({ isSyncing }) => {
    const [server, setServer] = useState('EUW');
    const [riotId, setRiotId] = useState('');
    const [localError, setLocalError] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [recentProfiles, setRecentProfiles] = useState([]);

    const navigate = useNavigate();
    const containerRef = useRef(null);

    // Charge les profils au montage du composant
    useEffect(() => {
        setRecentProfiles(getRecentProfiles());
    }, [showDropdown]); // Rafraîchit la liste à chaque ouverture

    // Gestion du clic en dehors du composant pour fermer le menu déroulant
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /**
     * Intercepte la soumission, valide le format et pousse la nouvelle URL.
     * Le backend n'est pas appelé ici. C'est le changement d'URL qui 
     * déclenchera l'analyse dans App.jsx.
     */
    const handleSubmit = (e) => {
        e.preventDefault();
        setLocalError('');

        if (!riotId.includes('#')) {
            setLocalError("Le format doit inclure un hashtag (ex: Faker#T1)");
            return;
        }

        const lastHashIndex = riotId.lastIndexOf('#');
        const gameName = riotId.substring(0, lastHashIndex).trim();
        const tagLine = riotId.substring(lastHashIndex + 1).trim();

        if (!gameName || !tagLine) {
            setLocalError("Le pseudo et le tag ne peuvent pas être vides.");
            return;
        }

        setShowDropdown(false);
        // Navigation sémantique par défaut vers l'historique lors d'une nouvelle recherche
        navigate(`/historique/${server.toLowerCase()}/${gameName}-${tagLine}`);
    };

    const handleProfileClick = (profile) => {
        setShowDropdown(false);
        setRiotId(`${profile.gameName}#${profile.tagLine}`);
        setServer(profile.server.toUpperCase());
        navigate(`/historique/${profile.server.toLowerCase()}/${profile.gameName}-${profile.tagLine}`);
    };

    const handleDeleteProfile = (e, id) => {
        e.stopPropagation(); // Empêche le clic de déclencher la navigation
        removeProfileFromHistory(id);
        setRecentProfiles(getRecentProfiles());
    };

    return (
        <div className="glass-panel p-4 mb-8 relative z-50" ref={containerRef}>
            <form onSubmit={handleSubmit} className="flex flex-wrap md:flex-nowrap gap-3 items-center relative">

                <select
                    value={server}
                    onChange={(e) => setServer(e.target.value)}
                    disabled={isSyncing}
                    className="bg-surface-solid text-gray-100 px-4 py-2 outline-none border border-border-strong focus:border-lol-gold rounded-md cursor-pointer disabled:opacity-50 transition-colors"
                >
                    <option value="EUW">EUW</option>
                    <option value="NA">NA</option>
                    <option value="KR">KR</option>
                </select>

                <div className="flex-1 min-w-[250px] relative">
                    <input
                        type="text"
                        placeholder="Riot ID complet (ex: Faker#T1)"
                        value={riotId}
                        onChange={(e) => setRiotId(e.target.value)}
                        onFocus={() => setShowDropdown(true)}
                        disabled={isSyncing}
                        className={`w-full bg-surface-solid text-gray-100 px-4 py-2 outline-none border rounded-md disabled:opacity-50 transition-colors ${localError ? 'border-lol-loss focus:border-lol-loss' : 'border-border-strong focus:border-lol-gold'}`}
                        required
                    />

                    {/* Menu déroulant de l'historique */}
                    {showDropdown && recentProfiles.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-surface-elevated border border-border-glass rounded-md shadow-lg overflow-hidden flex flex-col">
                            <div className="px-4 py-2 bg-surface-solid border-b border-border-glass text-xs font-bold text-lol-textMuted uppercase tracking-wider flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Profils récents
                            </div>
                            {recentProfiles.map(profile => (
                                <div
                                    key={profile.id}
                                    onClick={() => handleProfileClick(profile)}
                                    className="flex items-center justify-between px-4 py-3 hover:bg-surface-solid cursor-pointer transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold bg-app px-2 py-1 rounded text-lol-gold border border-lol-gold/20">
                                            {profile.server.toUpperCase()}
                                        </span>
                                        <span className="text-gray-100 font-medium">
                                            {profile.gameName}
                                            <span className="text-lol-textMuted">#{profile.tagLine}</span>
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => handleDeleteProfile(e, profile.id)}
                                        className="text-lol-textMuted hover:text-lol-loss opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                        title="Retirer de l'historique"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isSyncing || !riotId}
                    className="bg-lol-gold text-app font-bold px-6 py-2 rounded-md hover:bg-lol-goldHover shadow-glow-gold transition-all flex items-center justify-center gap-2 min-w-[140px] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                    {isSyncing ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Sync...</span>
                        </>
                    ) : (
                        <>
                            <Search className="w-5 h-5" />
                            <span>Chercher</span>
                        </>
                    )}
                </button>
            </form>

            {localError && (
                <div className="text-lol-loss text-sm mt-2 ml-1 font-medium">
                    {localError}
                </div>
            )}
        </div>
    );
};

export default SearchBar;