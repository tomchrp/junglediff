/**
 * ============================================================================
 * FICHIER : frontend/src/components/ui/CustomSelect.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Primitive visuelle remplaçant la balise HTML <select> native.
 * Permet un stylisme 100% contrôlé (Glassmorphism, survol, états actifs)
 * impossible à réaliser de manière cross-browser avec des <option> standards.
 * ============================================================================
 */
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CustomSelect({ value, options, onChange, placeholder = "Sélectionner..." }) {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef(null);

    // Fermeture du menu si on clique à l'extérieur
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (selectRef.current && !selectRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className="relative" ref={selectRef}>
            {/* BOUTON DÉCLENCHEUR */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                // Modification ici : ajout de h-7, suppression de py-1.5, passage en text-xs
                className={`flex items-center justify-between w-full min-w-[160px] h-7 bg-surface-solid text-gray-100 px-3 outline-none border rounded-md cursor-pointer text-xs transition-all duration-200 ${isOpen ? 'border-lol-gold shadow-glow-gold' : 'border-border-strong hover:border-gray-400'}`}
            >
                <span className="truncate pr-2 font-medium">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                {/* Légère réduction du chevron pour s'adapter aux 28px de hauteur */}
                <ChevronDown className={`w-3.5 h-3.5 text-lol-textMuted transition-transform duration-200 ${isOpen ? 'rotate-180 text-lol-gold' : ''}`} />
            </button>

            {/* MENU DÉROULANT (GLASSMORPHISM) */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-full bg-surface-elevated backdrop-blur-md border border-border-strong rounded-md shadow-glass z-50 max-h-60 overflow-y-auto custom-scrollbar overflow-x-hidden">
                    <div className="py-1">
                        {options.map((opt) => {
                            const isSelected = opt.value === value;
                            return (
                                <div
                                    key={opt.value}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                    }}
                                    className={`px-3 py-2 text-sm cursor-pointer transition-colors flex items-center ${isSelected
                                        ? 'bg-lol-gold/10 text-lol-gold font-bold border-l-2 border-lol-gold'
                                        : 'text-gray-200 hover:bg-surface-solid border-l-2 border-transparent hover:border-gray-500'
                                        }`}
                                >
                                    {opt.label}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}