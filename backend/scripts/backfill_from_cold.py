"""
===============================================================================
FICHIER : backend/scripts/backfill_from_cold.py
PROJET  : JungleDiff

DESCRIPTION :
Script de réhydratation (Backfill) autonome.
Parcourt récursivement le dossier 'cold_storage' pour récupérer les payloads 
JSON bruts de l'API Riot. Applique la dernière version du DataTrimmer et 
met à jour la colonne JSONB de PostgreSQL sans solliciter l'API Riot ni 
altérer les métadonnées existantes.
===============================================================================
"""

import os
import sys
import json
import asyncio
from pathlib import Path
from sqlalchemy import update

# Ajout du chemin parent pour permettre l'import des modules app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import AsyncSessionLocal
from app.db.models import Match, MatchTimeline
from app.services.trimmer import DataTrimmer

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COLD_STORAGE_DIR = os.path.join(BASE_DIR, "data", "cold_storage")

async def run_backfill():
    """
    Orchestre la lecture des fichiers froids et la mise à jour transactionnelle
    de la base de données.
    """
    print(f"Démarrage du Backfill depuis : {COLD_STORAGE_DIR}")
    
    if not os.path.exists(COLD_STORAGE_DIR):
        print("Erreur : Le dossier cold_storage n'existe pas.")
        return

    files = list(Path(COLD_STORAGE_DIR).rglob("*.json"))
    total_files = len(files)
    print(f"{total_files} fichiers trouvés. Analyse en cours...\n")

    matches_updated = 0
    timelines_updated = 0
    errors = 0

    async with AsyncSessionLocal() as session:
        for idx, file_path in enumerate(files, 1):
            filename = file_path.name
            
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    raw_data = json.load(f)
                
                # Le format de fichier attendu est : matchId_details.json ou matchId_timeline.json
                parts = filename.split("_")
                if len(parts) < 3:
                    continue
                
                # Reconstruction du match_id (ex: EUW1_123456)
                match_id = f"{parts[0]}_{parts[1]}"
                data_type = parts[2].replace(".json", "")

                if data_type == "details":
                    trimmed = DataTrimmer.trim_match_details(raw_data)
                    if trimmed:
                        stmt = update(Match).where(Match.match_id == match_id).values(raw_match_data=trimmed)
                        await session.execute(stmt)
                        matches_updated += 1
                        
                elif data_type == "timeline":
                    trimmed = DataTrimmer.trim_match_timeline(raw_data)
                    if trimmed:
                        stmt = update(MatchTimeline).where(MatchTimeline.match_id == match_id).values(raw_timeline_data=trimmed)
                        await session.execute(stmt)
                        timelines_updated += 1
                        
                if idx % 100 == 0:
                    print(f"Progression : {idx}/{total_files} fichiers traités...")
                    
            except Exception as e:
                print(f"Erreur sur le fichier {filename}: {str(e)}")
                errors += 1

        print("\nApplication des modifications en base de données...")
        await session.commit()

    print("\n--- Bilan du Backfill ---")
    print(f"Match Details mis à jour : {matches_updated}")
    print(f"Timelines mises à jour   : {timelines_updated}")
    print(f"Erreurs rencontrées      : {errors}")
    print("Opération terminée avec succès.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_backfill())