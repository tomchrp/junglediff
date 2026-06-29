"""
===============================================================================
FICHIER : backend/app/api/endpoints/chat.py
PROJET  : JungleDiff

DESCRIPTION :
Routeur FastAPI exposant l'interface conversationnelle.
Gère les requêtes HTTP POST et renvoie un flux Server-Sent Events (SSE) 
maintenu ouvert via StreamingResponse.
===============================================================================
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.db.session import get_db
from app.services.llm_service import LLMService

router = APIRouter()

class ChatRequest(BaseModel):
    prompt: str

@router.post("/{puuid}/match/{match_id}/chat")
async def chat_with_match_context(
    puuid: str,
    match_id: str,
    request: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Initie une session d'analyse LLM pour une partie spécifique.
    Retourne un flux 'text/event-stream'.
    """
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Le prompt est vide.")

    llm_service = LLMService(db)
    
    return StreamingResponse(
        llm_service.generate_chat_stream(puuid, match_id, request.prompt),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no" # Essentiel si tu utilises Nginx plus tard
        }
    )