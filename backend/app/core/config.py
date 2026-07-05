"""
===============================================================================
FICHIER : backend/app/core/config.py
PROJET  : JungleDiff

DESCRIPTION :
Ce fichier centralise et valide la configuration globale de l'application via
Pydantic. Il charge les variables d'environnement (base de données, Redis, 
paramètres de l'API Riot) et garantit que l'application ne démarre pas si une 
variable critique est manquante. Il prépare également le terrain pour la 
récupération dynamique de la clé API depuis Redis.

MODIFICATIONS :
- Ajout des paramètres de configuration S3/MinIO pour le Data Lake.
===============================================================================
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "JungleDiff API"
    VERSION: str = "1.0.0"

    # Base de données PostgreSQL
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_SERVER: str
    POSTGRES_DB: str
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"

    # Cache et File d'attente Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    
    @property
    def REDIS_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}"

    # Configuration Riot API
    # La clé est chargée ici au démarrage, mais le client HTTP devra
    # prioriser la vérification dans Redis pour le rechargement à chaud.
    RIOT_API_KEY: Optional[str] = None

    # API LLM (Gemma)
    GEMMA_API_KEY: str
    
    # Paramètres MinIO (Absolute Cold Storage)
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "junglediff_admin"
    MINIO_SECRET_KEY: str = "SuperSecretKey123!"
    MINIO_BUCKET_NAME: str = "junglediff-datalake"
    
    # Configuration Pydantic pour lire le fichier .env
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()