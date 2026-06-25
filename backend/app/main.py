"""
===============================================================================
FICHIER : backend/app/main.py
PROJET  : JungleDiff

DESCRIPTION :
Point d'entrée de l'application serveur FastAPI. Configure les politiques CORS
pour autoriser les requêtes du frontend React (Vite sur le port 5173) et inclut 
les routes de l'API.
===============================================================================
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router

app = FastAPI(
    title="JungleDiff API",
    description="Backend analytique pour League of Legends",
    version="1.0.0"
)

# Configuration stricte du CORS mise à jour pour le port 5173 (Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "L'API JungleDiff est en ligne et fonctionnelle."}