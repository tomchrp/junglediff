# -*- coding: utf-8 -*-
"""
===============================================================================
FICHIER : backend/app/worker/tasks.py
PROJET  : JungleDiff

DESCRIPTION :
Logique métier exécutée en arrière-plan par les workers ARQ.
Gère l'ingestion "On-Demand" prioritaire et le traitement des payloads Riot.

MODIFICATIONS :
- Implémentation d'un bouclier anti-boucle pour les modes de jeu ignorés.
  Désormais, les matchs hors-critères (ARAM, URF) sont enregistrés de façon
  minimale en base pour servir de filtre anti-doublon permanent.
- CORRECTION CRITIQUE (Topographie Match-V5) : Suppression de la clé d'insertion
  obsolète `position` dans le dictionnaire des participants pour s'aligner sur 
  le modèle de base de données unifié.
- CORRECTION SPATIALE : Mapping exhaustif des coordonnées de pathing (pos_f1_x à 
  pos_f3_y) issues du trimmer vers les requêtes d'insertion et de mise à jour 
  SQL pour hydrater la vue Premier Clear.
===============================================================================
"""

import logging
import asyncio
import random
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import update, select
from app.db.session import AsyncSessionLocal
from app.db.models import Match, MatchTimeline, Player, MatchParticipant
from app.services.riot_client import RiotClient
from app.services.trimmer import DataTrimmer
from app.services.storage_service import StorageService

logger = logging.getLogger("JungleDiffWorker")
storage_service = StorageService()

async def process_match_ingestion(ctx, match_id: str, continent: str, fetch_timeline: bool = False):
    """
    Tâche principale de téléchargement, filtrage et ingestion des parties.
    Analyse le mode de jeu et assure la persistance des registres anti-doublon.
    """
    riot_client: RiotClient = ctx["riot_client"]
    
    try:
        await asyncio.sleep(random.uniform(0.1, 0.5))
        
        # 1. Téléchargement Brut des détails depuis l'API Riot
        match_data = await riot_client.get_match_details(continent, match_id)
        if not match_data or "info" not in match_data:
            return {"status": "failed", "reason": "Données de match invalides"}
            
        queue_id = match_data["info"].get("queueId")
        
        # 2. Sécurité et filtrage des modes de jeu (Late Filtering)
        if queue_id not in [420, 440, 400, 490]:
            async with AsyncSessionLocal() as session:
                stmt_ignored = insert(Match).values(
                    match_id=match_id,
                    game_version=match_data["info"].get("gameVersion", "Unknown"),
                    game_duration=match_data["info"].get("gameDuration", 0),
                    creation_timestamp=match_data["info"].get("gameCreation", 0),
                    timeline_status="UNAVAILABLE",
                    raw_match_data={"info": {"queueId": queue_id, "participants": []}}
                ).on_conflict_do_nothing(index_elements=['match_id'])
                await session.execute(stmt_ignored)
                await session.commit()
            return {"status": "skipped", "reason": f"Mode de jeu ignoré ({queue_id})"}

        # 3. Sauvegarde dans le Data Lake et élagage pour le Warm Storage
        await storage_service.upload_json(match_id, "details", match_data)
        trimmed_match = DataTrimmer.trim_match_details(match_data)
        info = trimmed_match["info"]

        # 4. Téléchargement conditionnel et sécurisé de la Timeline
        trimmed_timeline = None
        timeline_status_val = "PENDING"
        
        if fetch_timeline:
            await asyncio.sleep(random.uniform(0.1, 0.5))
            timeline_data = await riot_client.get_match_timeline(continent, match_id)
            if timeline_data:
                await storage_service.upload_json(match_id, "timeline", timeline_data)
                trimmed_timeline = DataTrimmer.trim_match_timeline(timeline_data)
                timeline_status_val = "FETCHED"
            else:
                timeline_status_val = "UNAVAILABLE"
                logger.warning(f"Timeline 404 pour {match_id}.")

        # 5. Extraction des métriques analytiques temporelles (Big Data)
        metrics_dict = {}
        if trimmed_match and trimmed_timeline:
            metrics_dict = DataTrimmer.extract_timeline_metrics(trimmed_match, trimmed_timeline)

        # 6. Insertion et mise à jour de la base de données relationnelle
        async with AsyncSessionLocal() as session:
            update_dict = {"raw_match_data": trimmed_match}
            if fetch_timeline:
                update_dict["timeline_status"] = timeline_status_val

            stmt_match = insert(Match).values(
                match_id=match_id,
                game_version=info.get("gameVersion", "Unknown"),
                game_duration=info.get("gameDuration", 0),
                creation_timestamp=info.get("gameCreation", 0),
                timeline_status=timeline_status_val,
                raw_match_data=trimmed_match
            ).on_conflict_do_update(
                index_elements=['match_id'],
                set_=update_dict
            )
            await session.execute(stmt_match)
            
            if trimmed_timeline:
                stmt_timeline = insert(MatchTimeline).values(
                    match_id=match_id,
                    raw_timeline_data=trimmed_timeline
                ).on_conflict_do_nothing(index_elements=['match_id'])
                await session.execute(stmt_timeline)

            participants = info.get("participants", [])
            players_dict = {}
            participants_dict = {}

            for p in participants:
                p_puuid = p.get("puuid")
                if not p_puuid:
                    continue
                
                players_dict[p_puuid] = {
                    "puuid": p_puuid,
                    "riot_id_name": p.get("riotIdGameName", "Inconnu"),
                    "riot_id_tagline": p.get("riotIdTagline", "")
                }

                p_metrics = metrics_dict.get(p_puuid, {})
                participants_dict[p_puuid] = {
                    "match_id": match_id,
                    "puuid": p_puuid,
                    "team_id": p.get("teamId", 0),
                    "champion_id": p.get("championId", 0),
                    "lane": p.get("teamPosition", "NONE"),
                    "win": p.get("win", False),
                    "kills": p.get("kills", 0),
                    "deaths": p.get("deaths", 0),
                    "assists": p.get("assists", 0),
                    "gold_diff_15m": p_metrics.get("gold_diff_15m"),
                    "xp_diff_15m": p_metrics.get("xp_diff_15m"),
                    "is_snowballing": p_metrics.get("is_snowballing"),
                    "pos_f1_x": p_metrics.get("pos_f1_x"),
                    "pos_f1_y": p_metrics.get("pos_f1_y"),
                    "pos_f2_x": p_metrics.get("pos_f2_x"),
                    "pos_f2_y": p_metrics.get("pos_f2_y"),
                    "pos_f3_x": p_metrics.get("pos_f3_x"),
                    "pos_f3_y": p_metrics.get("pos_f3_y")
                }

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
                stmt_participants = stmt_participants.on_conflict_do_update(
                    constraint='uix_match_puuid',
                    set_=dict(
                        win=stmt_participants.excluded.win,
                        kills=stmt_participants.excluded.kills,
                        deaths=stmt_participants.excluded.deaths,
                        assists=stmt_participants.excluded.assists,
                        gold_diff_15m=stmt_participants.excluded.gold_diff_15m,
                        xp_diff_15m=stmt_participants.excluded.xp_diff_15m,
                        is_snowballing=stmt_participants.excluded.is_snowballing,
                        pos_f1_x=stmt_participants.excluded.pos_f1_x,
                        pos_f1_y=stmt_participants.excluded.pos_f1_y,
                        pos_f2_x=stmt_participants.excluded.pos_f2_x,
                        pos_f2_y=stmt_participants.excluded.pos_f2_y,
                        pos_f3_x=stmt_participants.excluded.pos_f3_x,
                        pos_f3_y=stmt_participants.excluded.pos_f3_y
                    )
                )
                await session.execute(stmt_participants)

            await session.commit()
            
        return {"status": "success", "match_id": match_id, "timeline_fetched": bool(trimmed_timeline)}

    except Exception as e:
        logger.error(f"Erreur inattendue sur {match_id}: {str(e)}")
        return {"status": "failed", "reason": str(e)}

async def process_timeline_only(ctx, match_id: str, continent: str):
    """
    Tâche d'extraction chirurgicale pour récupérer a posteriori une timeline manquante.
    """
    riot_client: RiotClient = ctx["riot_client"]
    try:
        async with AsyncSessionLocal() as session:
            existing_timeline = await session.get(MatchTimeline, match_id)
            if existing_timeline:
                return {"status": "skipped", "reason": "Timeline déjà présente en base"}

        await asyncio.sleep(random.uniform(0.1, 0.5))
        timeline_data = await riot_client.get_match_timeline(continent, match_id)
        
        if not timeline_data:
            async with AsyncSessionLocal() as session:
                await session.execute(
                    update(Match).where(Match.match_id == match_id).values(timeline_status="UNAVAILABLE")
                )
                await session.commit()
            return {"status": "failed", "reason": "Timeline indisponible chez Riot"}

        await storage_service.upload_json(match_id, "timeline", timeline_data)
        trimmed_timeline = DataTrimmer.trim_match_timeline(timeline_data)
        
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Match).where(Match.match_id == match_id))
            match_record = result.scalar_one_or_none()
            
            metrics_dict = {}
            if match_record and match_record.raw_match_data:
                metrics_dict = DataTrimmer.extract_timeline_metrics(match_record.raw_match_data, trimmed_timeline)
                
            stmt_timeline = insert(MatchTimeline).values(
                match_id=match_id,
                raw_timeline_data=trimmed_timeline
            ).on_conflict_do_nothing(index_elements=['match_id'])
            await session.execute(stmt_timeline)
            
            await session.execute(
                update(Match).where(Match.match_id == match_id).values(timeline_status="FETCHED")
            )
            
            if metrics_dict:
                for puuid, m in metrics_dict.items():
                    # Base de mise à jour (Économie)
                    update_values = {
                        "gold_diff_15m": m.get("gold_diff_15m"),
                        "xp_diff_15m": m.get("xp_diff_15m"),
                        "is_snowballing": m.get("is_snowballing")
                    }
                    
                    # Ajout des données spatiales conditionné exactement comme le Backfill
                    if m.get("pos_f1_x") is not None:
                        update_values.update({
                            "pos_f1_x": m.get("pos_f1_x"),
                            "pos_f1_y": m.get("pos_f1_y"),
                            "pos_f2_x": m.get("pos_f2_x"),
                            "pos_f2_y": m.get("pos_f2_y"),
                            "pos_f3_x": m.get("pos_f3_x"),
                            "pos_f3_y": m.get("pos_f3_y")
                        })
                        
                    await session.execute(
                        update(MatchParticipant)
                        .where(MatchParticipant.match_id == match_id)
                        .where(MatchParticipant.puuid == puuid)
                        .values(**update_values)
                    )
            await session.commit()
        return {"status": "success", "match_id": match_id}
    except Exception as e:
        logger.error(f"Erreur Timeline sur {match_id}: {str(e)}")
        return {"status": "failed", "reason": str(e)}