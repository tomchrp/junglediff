"""
===============================================================================
FICHIER : backend/app/services/storage_service.py
PROJET  : JungleDiff

DESCRIPTION :
Service d'interface avec MinIO (S3 Compatible). Agit comme l'unique point 
d'entrée et de sortie pour l'Absolute Cold Storage. Encapsule la librairie 
synchrone 'minio' dans des appels 'asyncio.to_thread' pour garantir son 
utilisation non bloquante au sein des workers asynchrones (ARQ/FastAPI).
===============================================================================
"""

import json
import logging
import asyncio
from io import BytesIO
from minio import Minio
from minio.error import S3Error
from app.core.config import settings

logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self):
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=False # Utilisation en HTTP strict pour le développement local Docker
        )
        self.bucket_name = settings.MINIO_BUCKET_NAME
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        """
        Vérifie l'existence du bucket de destination au démarrage.
        S'il est absent (ex: nouveau déploiement), il est instancié automatiquement.
        Cette méthode est synchrone car exécutée à l'initialisation du service.
        """
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                logger.info(f"Bucket MinIO '{self.bucket_name}' créé avec succès.")
        except S3Error as e:
            logger.error(f"Erreur d'initialisation MinIO : {e}")

    def _upload_sync(self, object_name: str, payload: dict):
        """Logique métier synchrone d'upload pour MinIO."""
        json_str = json.dumps(payload, ensure_ascii=False)
        json_bytes = json_str.encode('utf-8')
        data_stream = BytesIO(json_bytes)
        
        self.client.put_object(
            bucket_name=self.bucket_name,
            object_name=object_name,
            data=data_stream,
            length=len(json_bytes),
            content_type='application/json'
        )

    def _download_sync(self, object_name: str) -> dict:
        """Logique métier synchrone de téléchargement pour MinIO."""
        response = None
        try:
            response = self.client.get_object(self.bucket_name, object_name)
            data = response.read().decode('utf-8')
            return json.loads(data)
        except S3Error as e:
            if e.code == 'NoSuchKey':
                return None
            raise
        finally:
            if response:
                response.close()
                response.release_conn()

    async def upload_json(self, match_id: str, data_type: str, payload: dict) -> bool:
        """
        Génère une arborescence S3 propre (data_type/match_id.json) 
        et pousse le payload en arrière-plan sans bloquer la boucle asynchrone.
        
        Arguments :
            match_id (str): Identifiant natif Riot (ex: EUW1_123456)
            data_type (str): Catégorie ('details' ou 'timeline')
            payload (dict): JSON brut à stocker
        """
        object_name = f"{data_type}/{match_id}.json"
        try:
            await asyncio.to_thread(self._upload_sync, object_name, payload)
            return True
        except Exception as e:
            logger.error(f"Échec upload MinIO pour {object_name} : {e}")
            return False

    async def download_json(self, match_id: str, data_type: str) -> dict:
        """Récupère un JSON depuis le Data Lake."""
        object_name = f"{data_type}/{match_id}.json"
        try:
            return await asyncio.to_thread(self._download_sync, object_name)
        except Exception as e:
            logger.error(f"Échec téléchargement MinIO pour {object_name} : {e}")
            return None