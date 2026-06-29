/**
 * ============================================================================
 * FICHIER : frontend/src/services/chatService.js
 * PROJET  : JungleDiff
 * * DESCRIPTION :
 * Service de communication avec l'API LLM du backend. Utilise l'API native
 * Fetch pour lire un flux Server-Sent Events (SSE). Décode les morceaux de texte
 * et les données structurées (Widgets) à la volée.
 * ============================================================================
 */

/**
 * Initialise une connexion SSE avec le backend et traite le flux de reponse en temps reel.
 * * @param {string} puuid - Identifiant unique du joueur.
 * @param {string} matchId - Identifiant unique de la partie.
 * @param {string} prompt - La question posee par l'utilisateur.
 * @param {function} onTextChunk - Callback declenche a chaque nouveau fragment de texte recu.
 * @param {function} onWidgetData - Callback declenche lorsque des donnees structurees sont recues.
 * @param {function} onError - Callback en cas d'echec de la requete.
 * @param {function} onComplete - Callback declenche a la fin legitime du flux.
 */
export const streamChatResponse = async (
    puuid,
    matchId,
    prompt,
    onTextChunk,
    onWidgetData,
    onError,
    onComplete
) => {
    try {
        const response = await fetch(`http://localhost:8000/api/v1/chat/${puuid}/match/${matchId}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
            throw new Error("Erreur reseau lors de la communication avec l'IA.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');

            // On conserve le dernier element s'il n'est pas termine par \n\n
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6).trim();
                    if (!dataStr) continue;

                    try {
                        const parsedData = JSON.parse(dataStr);
                        if (parsedData.type === 'text_chunk') {
                            onTextChunk(parsedData.content);
                        } else if (parsedData.type === 'widget_data') {
                            onWidgetData(parsedData.data);
                        }
                    } catch (err) {
                        console.error("Erreur de parsing JSON sur le flux SSE :", err, "Data brute :", dataStr);
                    }
                }
            }
        }
        onComplete();
    } catch (error) {
        console.error("Echec du streaming :", error);
        onError(error.message);
    }
};