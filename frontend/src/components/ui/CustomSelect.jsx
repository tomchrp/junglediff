/**
 * ============================================================================
 * FICHIER : frontend/src/components/ui/CustomSelect.jsx
 * PROJET  : JungleDiff
 *
 * DESCRIPTION :
 * Primitive visuelle remplaçant la balise HTML <select> native.
 * * MODIFICATIONS RECENTES :
 * - CORRECTION UI : Suppression de la classe `min-w-[160px]` qui forçait un 
 * dépassement horizontal (overflow) lorsque le composant était utilisé dans 
 * un espace restreint comme la SearchBar, ce qui le faisait empiéter sur 
 * les autres éléments.
 * ============================================================================
 */
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CustomSelect({ value, options, onChange, placeholder = "Sélectionner...", buttonClassName = "h-7" }) {
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
        <div className="relative w-full" ref={selectRef}>
            {/* BOUTON DÉCLENCHEUR (Style Cavité) */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between w-full bg-black/20 shadow-inner text-gray-100 px-3 outline-none border rounded-md cursor-pointer text-xs transition-all duration-200 ${isOpen ? 'border-lol-gold bg-black/40' : 'border-border-glass hover:bg-white/5'} ${buttonClassName}`}
            >
                <span className="truncate pr-2 font-medium">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-lol-textMuted shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-lol-gold' : ''}`} />
            </button>

            {/* MENU DÉROULANT (Style Vitre) */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-full min-w-max bg-surface/90 backdrop-blur-xl border border-border-glass rounded-md shadow-glass z-50 max-h-60 overflow-y-auto custom-scrollbar overflow-x-hidden">
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
                                        ? 'bg-black/30 text-lol-gold font-bold shadow-inner border-l-2 border-lol-gold'
                                        : 'text-gray-200 hover:bg-white/5 border-l-2 border-transparent'
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