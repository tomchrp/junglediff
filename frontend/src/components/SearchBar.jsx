/**
 * ============================================================================
 * FICHIER : frontend/src/components/SearchBar.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Composant de recherche global avec historique intégré.
 * * MODIFICATIONS RECENTES :
 * - Intégration du composant <CustomSelect> pour le choix du serveur.
 * - L'input texte devient une cavité (bg-black/20, shadow-inner).
 * - Le dropdown de l'historique devient une vitre (backdrop-blur-xl).
 * - Le bouton d'action principal adopte le comportement interactif du verre.
 * ============================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRecentProfiles, removeProfileFromHistory } from '../services/historyService.js';
import CustomSelect from './ui/CustomSelect.jsx';

const SERVER_OPTIONS = [
    { value: 'EUW', label: 'EUW' },
    { value: 'NA', label: 'NA' },
    { value: 'KR', label: 'KR' }
];

const SearchBar = ({ isSyncing }) => {
    const [server, setServer] = useState('EUW');
    const [riotId, setRiotId] = useState('');
    const [localError, setLocalError] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [recentProfiles, setRecentProfiles] = useState([]);

    const navigate = useNavigate();
    const containerRef = useRef(null);

    useEffect(() => {
        setRecentProfiles(getRecentProfiles());
    }, [showDropdown]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        navigate(`/historique/${server.toLowerCase()}/${gameName}-${tagLine}`);
    };

    const handleProfileClick = (profile) => {
        setShowDropdown(false);
        setRiotId(`${profile.gameName}#${profile.tagLine}`);
        setServer(profile.server.toUpperCase());
        navigate(`/historique/${profile.server.toLowerCase()}/${profile.gameName}-${profile.tagLine}`);
    };

    const handleDeleteProfile = (e, id) => {
        e.stopPropagation();
        removeProfileFromHistory(id);
        setRecentProfiles(getRecentProfiles());
    };

    return (
        <div className="glass-panel p-4 mb-8 relative z-50" ref={containerRef}>
            <form onSubmit={handleSubmit} className="flex flex-wrap md:flex-nowrap gap-3 items-center relative">

                {/* Remplacement du <select> natif par le CustomSelect (avec hauteur fixée) */}
                <div className="w-[120px] shrink-0">
                    <CustomSelect
                        value={server}
                        options={SERVER_OPTIONS}
                        onChange={setServer}
                        buttonClassName="h-[42px] text-sm font-bold"
                    />
                </div>

                <div className="flex-1 min-w-[250px] relative">
                    <input
                        type="text"
                        placeholder="Riot ID complet (ex: Faker#T1)"
                        value={riotId}
                        onChange={(e) => setRiotId(e.target.value)}
                        onFocus={() => setShowDropdown(true)}
                        disabled={isSyncing}
                        className={`w-full bg-black/20 shadow-inner text-gray-100 px-4 py-2 outline-none border rounded-md disabled:opacity-50 transition-all duration-200 placeholder-gray-500 ${localError ? 'border-lol-loss focus:border-lol-loss focus:bg-black/30' : 'border-border-glass focus:border-lol-gold focus:bg-black/30'}`}
                        required
                    />

                    {/* Menu déroulant de l'historique (Glassmorphism) */}
                    {showDropdown && recentProfiles.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-surface/90 backdrop-blur-xl border border-border-glass rounded-md shadow-glass overflow-hidden flex flex-col z-50">
                            <div className="px-4 py-2 bg-black/30 shadow-inner border-b border-border-glass text-xs font-bold text-lol-textMuted uppercase tracking-wider flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Profils récents
                            </div>
                            {recentProfiles.map(profile => (
                                <div
                                    key={profile.id}
                                    onClick={() => handleProfileClick(profile)}
                                    className="flex items-center justify-between px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors group border-b border-border-glass/30 last:border-0"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold bg-black/40 shadow-inner px-2 py-1 rounded text-lol-gold border border-border-glass">
                                            {profile.server.toUpperCase()}
                                        </span>
                                        <span className="text-gray-100 font-medium drop-shadow-sm">
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

                {/* Bouton avec retour physique du Glassmorphism Interactive et Glow unifié */}
                <button
                    type="submit"
                    disabled={isSyncing || !riotId}
                    className="glass-panel-interactive btn-glow px-6 py-2 text-sm font-bold text-lol-gold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px] h-[42px]"
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
                <div className="text-lol-loss text-sm mt-2 ml-1 font-medium drop-shadow-sm">
                    {localError}
                </div>
            )}
        </div>
    );
};

export default SearchBar;