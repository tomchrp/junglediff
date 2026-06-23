"""
===============================================================================
FICHIER : backend/app/db/session.py
PROJET  : JungleDiff

DESCRIPTION :
Ce fichier gère la connexion asynchrone à la base de données PostgreSQL.
Il instancie le moteur SQLAlchemy et crée la fabrique de sessions (sessionmaker)
qui sera utilisée par nos repositories et workers pour interagir avec les tables
sans bloquer l'Event Loop de Python.
===============================================================================
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Création du moteur asynchrone. 
# echo=False en production pour ne pas polluer les logs avec toutes les requêtes SQL.
engine = create_async_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    echo=False,
    future=True
)

# Fabrique de sessions asynchrones
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_db():
    """
    Générateur de session asynchrone pour l'injection de dépendances dans FastAPI.
    Garantit que la session est proprement fermée après chaque requête HTTP, 
    même en cas d'erreur.
    """
    async with AsyncSessionLocal() as session:
        yield session