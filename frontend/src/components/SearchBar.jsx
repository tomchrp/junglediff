/**
 * ============================================================================
 * FICHIER : frontend/src/components/SearchBar.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Composant de recherche global. Utilise un champ unique pour le Riot ID 
 * complet (Format: Pseudo#Tag). Gère la validation et le découpage avant de 
 * transmettre les données au composant parent.
 * * DESIGN SYSTEM : Le conteneur principal devient un glass-panel. Les champs 
 * de saisie exploitent bg-surface-solid pour se détacher du fond sans opacité.
 * Le bouton d'action utilise bg-lol-gold avec un texte contrasté bg-app.
 * ============================================================================
 */

import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

const SearchBar = ({ onSearch, isSyncing }) => {
    const [server, setServer] = useState('EUW');
    const [riotId, setRiotId] = useState('');
    const [localError, setLocalError] = useState('');

    /**
     * Intercepte la soumission du formulaire, valide la présence du séparateur '#',
     * et sépare le Riot ID complet en gameName et tagLine.
     * Affiche une erreur sémantique si le format est invalide.
     * 
     * @param {Event} e - L'événement de soumission du formulaire
     */
    const handleSubmit = (e) => {
        e.preventDefault();
        setLocalError('');

        // Validation stricte du format attendu
        if (!riotId.includes('#')) {
            setLocalError("Le format doit inclure un hashtag (ex: KC NEXT AD KING#EUW)");
            return;
        }

        // Découpage par la dernière occurrence de # au cas où le pseudo en contiendrait un
        const lastHashIndex = riotId.lastIndexOf('#');
        const gameName = riotId.substring(0, lastHashIndex).trim();
        const tagLine = riotId.substring(lastHashIndex + 1).trim();

        if (!gameName || !tagLine) {
            setLocalError("Le pseudo et le tag ne peuvent pas être vides.");
            return;
        }

        onSearch(server, gameName, tagLine);
    };

    return (
        <div className="glass-panel p-4 mb-8">
            <form onSubmit={handleSubmit} className="flex flex-wrap md:flex-nowrap gap-3 items-center">

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
                        disabled={isSyncing}
                        className={`w-full bg-surface-solid text-gray-100 px-4 py-2 outline-none border rounded-md disabled:opacity-50 transition-colors ${localError ? 'border-lol-loss focus:border-lol-loss' : 'border-border-strong focus:border-lol-gold'
                            }`}
                        required
                    />
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