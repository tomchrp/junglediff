"""
===============================================================================
Fichier : backend/app/services/cartographe.py
Projet  : JungleDiff

Description :
Outil de profilage de données fonctionnant entièrement hors-ligne (Offline).
Il interroge la base de données PostgreSQL pour extraire les payloads JSONB
des tables Match et MatchTimeline. 
Il sépare rigoureusement la cartographie et exporte les résultats dans 
TROIS FICHIERS DISTINCTS : Détails du match, Événements, et Frames.
===============================================================================
"""

import sys
import os
import json
import asyncio
from sqlalchemy import select

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import AsyncSessionLocal
from app.db.models import Match, MatchTimeline

MAX_ENUM_VALUES = 50

def profile_value(value, current_schema):
    """
    Analyse le type et les bornes d'une valeur et met à jour le schéma cible.
    """
    v_type = type(value).__name__
    if "types" not in current_schema:
        current_schema["types"] = []
    if v_type not in current_schema["types"]:
        current_schema["types"].append(v_type)

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "min" not in current_schema:
            current_schema["min"] = value
            current_schema["max"] = value
        else:
            current_schema["min"] = min(current_schema["min"], value)
            current_schema["max"] = max(current_schema["max"], value)
    elif isinstance(value, str):
        if "enumerations" not in current_schema:
            current_schema["enumerations"] = set()
        
        if isinstance(current_schema["enumerations"], set):
            if len(current_schema["enumerations"]) < MAX_ENUM_VALUES:
                current_schema["enumerations"].add(value)
            else:
                current_schema["enumerations"] = None

def traverse_and_map(data, schema):
    """Parcourt récursivement les données JSON pour alimenter le profilage."""
    if isinstance(data, dict):
        for key, val in data.items():
            if key not in schema:
                schema[key] = {}
            if isinstance(val, (dict, list)):
                traverse_and_map(val, schema[key])
            else:
                profile_value(val, schema[key])
    elif isinstance(data, list):
        if "item_schema" not in schema:
            schema["item_schema"] = {}
        for item in data:
            if isinstance(item, (dict, list)):
                traverse_and_map(item, schema["item_schema"])
            else:
                profile_value(item, schema["item_schema"])

def format_schema_for_export(schema):
    """Convertit les sets en listes et supprime les clés d'énumérations annulées."""
    if isinstance(schema, dict):
        if 'enumerations' in schema:
            if schema['enumerations'] is None:
                del schema['enumerations']
            elif isinstance(schema['enumerations'], set):
                schema['enumerations'] = sorted(list(schema['enumerations']))
        for k, v in schema.items():
            format_schema_for_export(v)

async def main():
    print("Démarrage de la cartographie hors-ligne depuis PostgreSQL...")
    
    schema_details = {"keys_profile": {}}
    schema_events = {}
    schema_frames = {"keys_profile": {}}

    async with AsyncSessionLocal() as session:
        # Récupération des Matchs (Détails)
        query_matches = select(Match.raw_match_data).limit(100)
        result_matches = await session.execute(query_matches)
        raw_matches = result_matches.scalars().all()
        
        print(f"Analyse de {len(raw_matches)} bilans de match...")
        for raw_data in raw_matches:
            if "info" in raw_data:
                traverse_and_map(raw_data["info"], schema_details["keys_profile"])

        # Récupération des Timelines (Événements et Frames)
        query_timelines = select(MatchTimeline.raw_timeline_data).limit(100)
        result_timelines = await session.execute(query_timelines)
        raw_timelines = result_timelines.scalars().all()
        
        print(f"Analyse de {len(raw_timelines)} timelines (séparation events/frames)...")
        for raw_tl in raw_timelines:
            if "info" in raw_tl and "frames" in raw_tl["info"]:
                for frame in raw_tl["info"]["frames"]:
                    # 1. Extraction des événements ponctuels
                    if "events" in frame:
                        for event in frame["events"]:
                            event_type = event.get("type", "UNKNOWN_EVENT")
                            if event_type not in schema_events:
                                schema_events[event_type] = {"keys_profile": {}}
                            traverse_and_map(event, schema_events[event_type]["keys_profile"])
                    
                    # 2. Extraction des statistiques à la minute (Frames)
                    if "participantFrames" in frame:
                        for p_id, p_frame in frame["participantFrames"].items():
                            traverse_and_map(p_frame, schema_frames["keys_profile"])

    print("Formatage des données pour l'export...")
    format_schema_for_export(schema_details)
    format_schema_for_export(schema_events)
    format_schema_for_export(schema_frames)
    
    # Export dans trois fichiers séparés
    output_dir = os.path.dirname(__file__)
    
    file_details = os.path.join(output_dir, "schema_match_details.json")
    file_events = os.path.join(output_dir, "schema_timeline_events.json")
    file_frames = os.path.join(output_dir, "schema_timeline_frames.json")
    
    with open(file_details, "w", encoding="utf-8") as f:
        json.dump({"match_details": schema_details}, f, indent=4, ensure_ascii=False)
        
    with open(file_events, "w", encoding="utf-8") as f:
        json.dump(schema_events, f, indent=4, ensure_ascii=False)
        
    with open(file_frames, "w", encoding="utf-8") as f:
        json.dump({"timeline_frames": schema_frames}, f, indent=4, ensure_ascii=False)
        
    print("Cartographie terminée. 3 fichiers générés :")
    print(f"- {file_details}")
    print(f"- {file_events}")
    print(f"- {file_frames}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())