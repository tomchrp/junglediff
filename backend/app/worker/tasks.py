"""
===============================================================================
FICHIER : backend/app/worker/tasks.py
PROJET  : JungleDiff

DESCRIPTION :
Logique métier exécutée en arrière-plan par les workers ARQ.
Reçoit uniquement des matchs garantis (inédits et compétitifs).

MODIFICATIONS RÉCENTES :
- Lissage réseau (Jitter)
- Téléchargement conditionnel de la timeline (fetch_timeline)
- Correction OS (Windows/Linux) du chemin de stockage du Data Lake.
===============================================================================
"""

import os
import json
import logging
import asyncio
import random
from datetime import datetime
from sqlalchemy.dialects.postgresql import insert
from app.db.session import AsyncSessionLocal
from app.db.models import Match, MatchTimeline, Player, MatchParticipant
from app.services.riot_client import RiotClient
from app.services.trimmer import DataTrimmer

logger = logging.getLogger("JungleDiffWorker")

# Construction d'un chemin relatif robuste (backend/data/cold_storage)
# Évite les erreurs de permission Windows sur C:\data
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
COLD_STORAGE_DIR = os.path.join(BASE_DIR, "data", "cold_storage")

async def save_to_cold_storage(match_id: str, data_type: str, data: dict) -> None:
    """Sauvegarde les données brutes issues de l'API Riot sur un stockage persistant."""
    try:
        now = datetime.now()
        folder_path = os.path.join(COLD_STORAGE_DIR, str(now.year), f"{now.month:02d}")
        os.makedirs(folder_path, exist_ok=True)
        
        file_path = os.path.join(folder_path, f"{match_id}_{data_type}.json")
        
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
            
    except Exception as e:
        logger.error(f"Échec de l'écriture en Cold Storage pour {match_id} ({data_type}) : {str(e)}")


async def process_match_ingestion(ctx, match_id: str, continent: str, fetch_timeline: bool = False):
    """Tâche principale de téléchargement et d'ingestion des parties complètes."""
    riot_client: RiotClient = ctx["riot_client"]
    
    try:
        # Lissage aléatoire (0.1 à 0.5 sec)
        await asyncio.sleep(random.uniform(0.1, 0.5))
        
        # 1. Téléchargement Brut des détails
        match_data = await riot_client.get_match_details(continent, match_id)
        if not match_data or "info" not in match_data:
            return {"status": "failed", "reason": "Données de match invalides"}
            
        queue_id = match_data["info"].get("queueId")
        if queue_id not in [420, 440, 400, 490]:
            return {"status": "skipped", "reason": f"Mode de jeu ignoré ({queue_id})"}

        # 2. Sécurisation et élagage des détails
        await save_to_cold_storage(match_id, "details", match_data)
        trimmed_match = DataTrimmer.trim_match_details(match_data)
        info = trimmed_match["info"]

        # 3. Téléchargement et traitement CONDITIONNEL de la Timeline
        trimmed_timeline = None
        if fetch_timeline:
            await asyncio.sleep(random.uniform(0.1, 0.5))
            timeline_data = await riot_client.get_match_timeline(continent, match_id)
            if timeline_data:
                await save_to_cold_storage(match_id, "timeline", timeline_data)
                trimmed_timeline = DataTrimmer.trim_match_timeline(timeline_data)
            else:
                logger.warning(f"Timeline indisponible pour {match_id} malgré la demande.")

        # 4. Insertion en Base de Données (Bulk Upsert)
        async with AsyncSessionLocal() as session:
            stmt_match = insert(Match).values(
                match_id=match_id,
                game_version=info.get("gameVersion", "Unknown"),
                game_duration=info.get("gameDuration", 0),
                creation_timestamp=info.get("gameCreation", 0),
                raw_match_data=trimmed_match
            ).on_conflict_do_nothing(index_elements=['match_id'])
            await session.execute(stmt_match)
            
            if trimmed_timeline:
                stmt_timeline = insert(MatchTimeline).values(
                    match_id=match_id,
                    raw_timeline_data=trimmed_timeline
                ).on_conflict_do_nothing(index_elements=['match_id'])
                await session.execute(stmt_timeline)

            # --- CORRECTION DU DEADLOCK ICI ---
            participants = info.get("participants", [])
            players_dict = {}
            participants_dict = {}

            for p in participants:
                p_puuid = p.get("puuid")
                if not p_puuid:
                    continue
                
                # L'utilisation de dictionnaires dédoublonne naturellement 
                # si Riot envoie deux fois le même joueur par erreur
                players_dict[p_puuid] = {
                    "puuid": p_puuid,
                    "riot_id_name": p.get("riotIdGameName", "Inconnu"),
                    "riot_id_tagline": p.get("riotIdTagline", "")
                }

                participants_dict[p_puuid] = {
                    "match_id": match_id,
                    "puuid": p_puuid,
                    "team_id": p.get("teamId", 0),
                    "champion_id": p.get("championId", 0),
                    "lane": p.get("teamPosition", "NONE"),
                    "position": p.get("teamPosition", "NONE"),
                    "win": p.get("win", False),
                    "kills": p.get("kills", 0),
                    "deaths": p.get("deaths", 0),
                    "assists": p.get("assists", 0)
                }

            # TRI OBLIGATOIRE PAR PUUID : Garantit que tous les workers 
            # verrouillent les lignes SQL dans le même ordre (évite le Deadlock)
            players_data = [players_dict[k] for k in sorted(players_dict.keys())]
            participants_data = [participants_dict[k] for k in sorted(participants_dict.keys())]

            if players_data:
                stmt_players = insert(Player).values(players_data)
                stmt_players = stmt_players.on_conflict_do_update(
                    index_elements=['puuid'],
                    set_=dict(
                        riot_id_name=stmt_players.excluded.riot_id_name,
                        riot_id_tagline=stmt_players.excluded.riot_id_tagline
                    )
                )
                await session.execute(stmt_players)

            if participants_data:
                stmt_participants = insert(MatchParticipant).values(participants_data)
                stmt_participants = stmt_participants.on_conflict_do_nothing(constraint='uix_match_puuid')
                await session.execute(stmt_participants)

            await session.commit()
            
        return {"status": "success", "match_id": match_id, "timeline_fetched": bool(trimmed_timeline)}

    except Exception as e:
        logger.error(f"Erreur inattendue sur {match_id}: {str(e)}")
        return {"status": "failed", "reason": str(e)}
    
async def process_timeline_only(ctx, match_id: str, continent: str):
    """Tâche chirurgicale déclenchée à la volée."""
    riot_client: RiotClient = ctx["riot_client"]
    
    try:
        async with AsyncSessionLocal() as session:
            existing_timeline = await session.get(MatchTimeline, match_id)
            if existing_timeline:
                return {"status": "skipped", "reason": "Timeline déjà présente en base"}

        await asyncio.sleep(random.uniform(0.1, 0.5))
        
        timeline_data = await riot_client.get_match_timeline(continent, match_id)
        if not timeline_data:
            return {"status": "failed", "reason": "Timeline indisponible chez Riot"}

        await save_to_cold_storage(match_id, "timeline", timeline_data)
        trimmed_timeline = DataTrimmer.trim_match_timeline(timeline_data)
        
        async with AsyncSessionLocal() as session:
            stmt_timeline = insert(MatchTimeline).values(
                match_id=match_id,
                raw_timeline_data=trimmed_timeline
            ).on_conflict_do_nothing(index_elements=['match_id'])
            
            await session.execute(stmt_timeline)
            await session.commit()
            
        return {"status": "success", "match_id": match_id}

    except Exception as e:
        logger.error(f"Erreur Timeline sur {match_id}: {str(e)}")
        return {"status": "failed", "reason": str(e)}