/**
 * ============================================================================
 * FICHIER : frontend/src/components/chat/ChatBox.jsx
 * PROJET  : JungleDiff
 * * DESCRIPTION :
 * Conteneur interactif permettant a l'utilisateur de dialoguer avec l'IA.
 * Gere l'historique des messages, le champ de saisie, et integre le service
 * de streaming pour un rendu en temps reel.
 * ============================================================================
 */

import React, { useState, useRef, useEffect } from 'react';
import { streamChatResponse } from '../../services/chatService';
import SpellWidget from './SpellWidget';

/**
 * Composant principal de discussion IA, a inserer dans une MatchCard.
 * * @param {string} props.puuid - Identifiant du joueur analyse.
 * @param {string} props.matchId - Identifiant de la partie concernee.
 */
const ChatBox = ({ puuid, matchId }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);

    const messagesEndRef = useRef(null);

    // Fait defiler la zone de texte vers le bas automatiquement lors du stream
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isStreaming) return;

        const userMessage = { role: 'user', content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsStreaming(true);

        // Initialisation d'un message assistant vide
        let currentAssistantMessage = { role: 'assistant', content: '', widget: null };
        setMessages((prev) => [...prev, currentAssistantMessage]);

        await streamChatResponse(
            puuid,
            matchId,
            userMessage.content,
            (textChunk) => {
                currentAssistantMessage.content += textChunk;
                setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { ...currentAssistantMessage };
                    return newMessages;
                });
            },
            (widgetData) => {
                currentAssistantMessage.widget = widgetData;
                setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { ...currentAssistantMessage };
                    return newMessages;
                });
            },
            (errorMsg) => {
                currentAssistantMessage.content += `\n[Erreur : ${errorMsg}]`;
                setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { ...currentAssistantMessage };
                    return newMessages;
                });
                setIsStreaming(false);
            },
            () => {
                setIsStreaming(false);
            }
        );
    };

    return (
        <div className="flex flex-col h-full mt-4 border-t border-white/10 pt-4 gap-4 min-h-0">

            {/* Remplacement de max-h-64 par flex-1 et min-h-0 pour prendre toute la hauteur */}
            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3 min-h-0 custom-scrollbar">
                {messages.length === 0 && (
                    <p className="text-white/40 text-sm text-center italic">
                        Posez une question sur cette partie (ex: "Combien de fois ai-je flash ?")
                    </p>
                )}

                {messages.map((msg, index) => (
                    <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div
                            className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user'
                                    ? 'bg-white/10 text-white'
                                    : 'bg-transparent text-white/80 border-l-2 border-lol-gold pl-4'
                                }`}
                        >
                            {msg.content}
                        </div>

                        {msg.widget && (
                            <div className="w-full mt-2">
                                <SpellWidget data={msg.widget} />
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2 shrink-0 pb-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Analysez cette partie..."
                    disabled={isStreaming}
                    className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-lol-gold transition-colors disabled:opacity-50"
                />
                <button
                    type="submit"
                    disabled={isStreaming || !input.trim()}
                    className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Envoyer
                </button>
            </form>
        </div>
    );
};

export default ChatBox;