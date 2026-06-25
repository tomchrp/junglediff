"""
===============================================================================
FICHIER : backend/app/api/router.py
PROJET  : JungleDiff

DESCRIPTION :
Routeur principal agrégeant tous les sous-routeurs de l'application (players, 
matches, etc.) avant leur injection dans l'instance FastAPI.
===============================================================================
"""

from fastapi import APIRouter
from app.api.endpoints import players, matches

api_router = APIRouter()

api_router.include_router(players.router, prefix="/players", tags=["Players"])
api_router.include_router(matches.router, prefix="/matches", tags=["Matches"])