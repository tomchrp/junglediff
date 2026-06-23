"""
===============================================================================
FICHIER : backend/app/services/mapper.py
PROJET  : JungleDiff

DESCRIPTION :
Script autonome (Cartographe API) destiné à analyser un échantillon de parties
hétérogènes. Il télécharge les payloads bruts (Match et Timeline) depuis l'API 
Match V5, itère récursivement sur chaque clé, et dresse un profil strict des 
types de données, des valeurs numériques (min/max) et des énumérations 
(chaînes de caractères uniques).
===============================================================================
"""

import asyncio
import json
import os
from typing import Any, Dict, List
from app.core.config import settings
from app.services.riot_client import RiotClient

def analyze_value(value: Any, current_schema: Dict[str, Any]):
    """
    Analyse une valeur unitaire et met à jour le schéma avec son type, 
    ses bornes (si nombre) ou ses énumérations (si chaîne).
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
        # On limite le nombre d'énumérations pour éviter de stocker des ID uniques
        if len(current_schema["enumerations"]) < 50: 
            current_schema["enumerations"].add(value)

def traverse_and_map(data: Any, schema: Dict[str, Any]):
    """
    Parcourt récursivement une structure de données complexe (dict ou list)
    et met à jour l'arbre du schéma en appelant analyze_value sur les feuilles.
    
    Args:
        data: Le sous-noeud JSON en cours d'analyse.
        schema: Le dictionnaire de profilage correspondant à ce noeud.
    """
    if isinstance(data, dict):
        for key, val in data.items():
            if key not in schema:
                schema[key] = {}
            if isinstance(val, (dict, list)):
                traverse_and_map(val, schema[key])
            else:
                analyze_value(val, schema[key])
                
    elif isinstance(data, list):
        if "item_schema" not in schema:
            schema["item_schema"] = {}
        for item in data:
            if isinstance(item, (dict, list)):
                traverse_and_map(item, schema["item_schema"])
            else:
                analyze_value(item, schema["item_schema"])

def convert_sets_to_lists(schema: Dict[str, Any]):
    """
    Convertit les objets 'set' générés pendant l'analyse en 'list' 
    afin de permettre la sérialisation finale au format JSON.
    """
    for key, val in schema.items():
        if isinstance(val, set):
            schema[key] = list(val)
            schema[key].sort()
        elif isinstance(val, dict):
            convert_sets_to_lists(val)

async def main():
    """Point d'entrée du cartographe."""
    if not settings.RIOT_API_KEY:
        print("ERREUR : Clé RIOT_API_KEY manquante dans backend/.env")
        return

    client = RiotClient(settings.RIOT_API_KEY)
    
    # Paramètres de ciblage de l'échantillon
    CONTINENT = "europe"
    GAME_NAME = input("Entrez le Riot ID (ex: Faker): ")
    TAGLINE = input("Entrez le Tagline (ex: EUW): ")
    
    print(f"Recherche du PUUID pour {GAME_NAME}#{TAGLINE}...")
    account_data = await client.get_account_by_riot_id(CONTINENT, GAME_NAME, TAGLINE)
    if not account_data:
        print("Joueur introuvable.")
        return
        
    puuid = account_data['puuid']
    print(f"PUUID trouvé. Récupération des 100 derniers matchs pertinents...")
    
    # 420: Solo/Duo, 440: Flex, 400: Normal Draft, 490: Quickplay
    target_queues = [420, 440, 400, 490]
    match_ids = []
    
    for q_id in target_queues:
        ids = await client.get_match_ids_by_puuid(CONTINENT, puuid, queue_type=q_id, count=25)
        if ids:
            match_ids.extend(ids)
            
    # Dédoublonnage au cas où
    match_ids = list(set(match_ids))[:100]
    print(f"{len(match_ids)} matchs trouvés. Début du profilage (cela peut prendre du temps à cause du Rate Limit)...")

    master_schema = {"match_details": {}, "timeline_events": {}}

    for index, match_id in enumerate(match_ids):
        print(f"Traitement {index + 1}/{len(match_ids)} : {match_id}")
        
        # 1. Cartographie des détails
        match_data = await client.get_match_details(CONTINENT, match_id)
        if match_data and "info" in match_data:
            traverse_and_map(match_data["info"], master_schema["match_details"])
            
        # 2. Cartographie de la timeline
        timeline_data = await client.get_match_timeline(CONTINENT, match_id)
        if timeline_data and "info" in timeline_data and "frames" in timeline_data["info"]:
            # On explore les événements spécifiques de la timeline
            for frame in timeline_data["info"]["frames"]:
                if "events" in frame:
                    for event in frame["events"]:
                        event_type = event.get("type", "UNKNOWN_EVENT")
                        if event_type not in master_schema["timeline_events"]:
                            master_schema["timeline_events"][event_type] = {}
                        traverse_and_map(event, master_schema["timeline_events"][event_type])

    # Nettoyage et Export
    print("Analyse terminée. Formatage des données...")
    convert_sets_to_lists(master_schema)
    
    output_path = os.path.join(os.path.dirname(__file__), "schema_profile.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(master_schema, f, indent=4, ensure_ascii=False)
        
    print(f"Cartographie terminée avec succès. Fichier généré : {output_path}")

if __name__ == "__main__":
    asyncio.run(main())