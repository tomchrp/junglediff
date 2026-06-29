"""
===============================================================================
FICHIER : backend/app/services/llm_service.py
PROJET  : JungleDiff

DESCRIPTION :
Service d'orchestration pour le modèle LLM. 
Implémente le pattern "Context Injection" (RAG) combiné au "Chain of Thought".
Utilise le SDK officiel Google GenAI pour l'inférence en streaming continu.
===============================================================================
"""

import json
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from google import genai
from google.genai import types

from app.core.config import settings
from app.db.repositories import MatchRepository

class LLMService:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self.api_key = settings.GEMMA_API_KEY
        
        # Initialisation du client officiel Google GenAI
        self.client = genai.Client(api_key=self.api_key)
        self.model_name = "gemma-4-31b-it"

    async def generate_chat_stream(self, puuid: str, match_id: str, user_prompt: str) -> AsyncGenerator[str, None]:
        """
        Orchestre le flux d'analyse LLM en générant des événements Server-Sent Events (SSE).
        
        Processus :
        1. Extraction synchrone des statistiques de sorts depuis PostgreSQL.
        2. Émission immédiate d'un événement 'widget_data' pour un rendu UI instantané.
        3. Construction d'un prompt ultra-strict via des balises XML (Rôle, Directives, Contexte).
        4. Inférence asynchrone en streaming via le module `aio` du client Google GenAI,
           avec interception des fragments de texte pour nourrir l'interface progressivement.
        """
        repo = MatchRepository(self.db)
        
        # ---------------------------------------------------------------------
        # ÉTAPE 1 : Le Routeur Sémantique (Simulé) et Extraction
        # ---------------------------------------------------------------------
        intention_detectee = "SORTS"

        if intention_detectee == "SORTS":
            extracted_data = await repo.get_match_spell_casts(puuid, match_id)
            
            # Envoi immédiat du widget au frontend
            widget_event = json.dumps({"type": "widget_data", "data": extracted_data})
            yield f"data: {widget_event}\n\n"
        else:
            extracted_data = {"erreur": "Aucune donnée contextuelle disponible."}

        # ---------------------------------------------------------------------
        # ÉTAPE 2 : Construction du Prompt avec Ingénierie Stricte (XML)
        # ---------------------------------------------------------------------
        system_prompt = """<ROLE_ET_OBJECTIF>
Tu es un expert analytique de League of Legends. Réponds directement et de manière très concise à la question du joueur en utilisant UNIQUEMENT les données factuelles fournies.
</ROLE_ET_OBJECTIF>

<DIRECTIVES_DE_REDACTION>
1. Interdiction absolue d'utiliser une balise de réflexion. Formule ta réponse immédiatement.
2. Utilise le vouvoiement.
3. Reste strictement factuel. Ne devine jamais les sorts, utilise les champs 'nom_sort_invocateur_1' et 'nom_sort_invocateur_2' fournis dans le contexte.
4. Va droit au but, la réponse doit faire 2 ou 3 phrases maximum.
</DIRECTIVES_DE_REDACTION>"""

        user_content = f"""<CONTEXTE_DONNEES>
Question de l'utilisateur : {user_prompt}

Statistiques exactes du joueur extraites de la partie (JSON) :
{json.dumps(extracted_data, indent=2)}
</CONTEXTE_DONNEES>"""

        # ---------------------------------------------------------------------
        # ÉTAPE 3 : Appel Streamé via SDK Google GenAI (Asynchrone)
        # ---------------------------------------------------------------------
        try:
            # Utilisation de l'interface asynchrone native du client (client.aio)
            response_stream = await self.client.aio.models.generate_content_stream(
                model=self.model_name,
                contents=user_content,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.3
                )
            )

            async for chunk in response_stream:
                if chunk.text:
                    text_event = json.dumps({"type": "text_chunk", "content": chunk.text})
                    yield f"data: {text_event}\n\n"

        except Exception as e:
            error_event = json.dumps({"type": "text_chunk", "content": f"\n\n[Erreur de génération : {str(e)}]"})
            yield f"data: {error_event}\n\n"