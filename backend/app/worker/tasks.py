# backend/app/worker/tasks.py

"""
===============================================================================
FICHIER : backend/app/worker/tasks.py
PROJET  : JungleDiff

DESCRIPTION :
Logique métier exécutée en arrière-plan par les workers ARQ.
Gère l'ingestion "On-Demand" prioritaire déclenchée par l'interaction utilisateur.

MODIFICATIONS (PHASE 4 BIG DATA & MINIO) :
- Remplacement du système de fichiers local par StorageService (MinIO Data Lake).
- Intégration de l'extraction des métriques de timeline (gold_diff_15m, etc.).
- Mise à jour intelligente des tables relationnelles (MatchParticipant) avec les
  nouvelles statistiques analytiques.
- Gestion robuste du timeline_status (Protection contre les erreurs 404 de Riot).
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

# Instanciation globale du service de stockage (Créera le bucket MinIO si nécessaire)
storage_service = StorageService()

async def process_match_ingestion(ctx, match_id: str, continent: str, fetch_timeline: bool = False):
    """Tâche principale de téléchargement et d'ingestion des parties complètes."""
    riot_client: RiotClient = ctx["riot_client"]
    
    try:
        # Lissage aléatoire (0.1 à 0.5 sec) pour éviter le burst limit de Riot
        await asyncio.sleep(random.uniform(0.1, 0.5))
        
        # 1. Téléchargement Brut des détails
        match_data = await riot_client.get_match_details(continent, match_id)
        if not match_data or "info" not in match_data:
            return {"status": "failed", "reason": "Données de match invalides"}
            
        queue_id = match_data["info"].get("queueId")
        if queue_id not in [420, 440, 400, 490]:
            return {"status": "skipped", "reason": f"Mode de jeu ignoré ({queue_id})"}

        # 2. Sauvegarde Data Lake (Cold Storage) et élagage (Warm Storage)
        await storage_service.upload_json(match_id, "details", match_data)
        trimmed_match = DataTrimmer.trim_match_details(match_data)
        info = trimmed_match["info"]

        # 3. Téléchargement et traitement CONDITIONNEL de la Timeline
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
                logger.warning(f"Timeline 404 (Indisponible) pour {match_id} malgré la demande.")

        # 4. Ingénierie Analytique (Extraction des stats Big Data à 15 minutes)
        metrics_dict = {}
        if trimmed_match and trimmed_timeline:
            metrics_dict = DataTrimmer.extract_timeline_metrics(trimmed_match, trimmed_timeline)

        # 5. Insertion en Base de Données (Bulk Upsert)
        async with AsyncSessionLocal() as session:
            
            # --- CORRECTION DE LA FAILLE ANTI-BOUCLE ---
            # On prépare le dictionnaire de mise à jour en cas de conflit
            update_dict = {"raw_match_data": trimmed_match}
            
            # On ne met à jour le statut de la timeline QUE si le worker manuel 
            # a été explicitement mandaté pour s'en occuper. Sinon, on préserve 
            # le statut existant (ex: FETCHED ou UNAVAILABLE) laissé par le Crawler.
            if fetch_timeline:
                update_dict["timeline_status"] = timeline_status_val

            stmt_match = insert(Match).values(
                match_id=match_id,
                game_version=info.get("gameVersion", "Unknown"),
                game_duration=info.get("gameDuration", 0),
                creation_timestamp=info.get("gameCreation", 0),
                timeline_status=timeline_status_val, # Utilisé uniquement pour un INSERT (Nouveau match)
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

                # Récupération des métriques analytiques si disponibles
                p_metrics = metrics_dict.get(p_puuid, {})

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
                    "assists": p.get("assists", 0),
                    
                    # NOUVELLES METRIQUES BIG DATA
                    "gold_diff_15m": p_metrics.get("gold_diff_15m"),
                    "xp_diff_15m": p_metrics.get("xp_diff_15m"),
                    "is_snowballing": p_metrics.get("is_snowballing")
                }

            # TRI OBLIGATOIRE PAR PUUID : Anti-Deadlock transactionnel
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
                        is_snowballing=stmt_participants.excluded.is_snowballing
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
    Tâche chirurgicale déclenchée à la volée. 
    Maintenant capable d'enrichir la base de données Hot Storage (MatchParticipant)
    avec les métriques analytiques calculées a posteriori.
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
            # Sécurité 404 : On met à jour le statut du Match pour que le Big Data ne le réessaye plus
            async with AsyncSessionLocal() as session:
                await session.execute(
                    update(Match).where(Match.match_id == match_id).values(timeline_status="UNAVAILABLE")
                )
                await session.commit()
            return {"status": "failed", "reason": "Timeline indisponible chez Riot"}

        # Sauvegarde Cold Storage
        await storage_service.upload_json(match_id, "timeline", timeline_data)
        trimmed_timeline = DataTrimmer.trim_match_timeline(timeline_data)
        
        async with AsyncSessionLocal() as session:
            # Pour calculer les métriques Big Data, nous avons besoin du JSON de match existant
            result = await session.execute(select(Match).where(Match.match_id == match_id))
            match_record = result.scalar_one_or_none()
            
            metrics_dict = {}
            if match_record and match_record.raw_match_data:
                metrics_dict = DataTrimmer.extract_timeline_metrics(match_record.raw_match_data, trimmed_timeline)
                
            # Insertion Timeline Tiède (Warm Storage)
            stmt_timeline = insert(MatchTimeline).values(
                match_id=match_id,
                raw_timeline_data=trimmed_timeline
            ).on_conflict_do_nothing(index_elements=['match_id'])
            await session.execute(stmt_timeline)
            
            # Mise à jour du Flag
            await session.execute(
                update(Match).where(Match.match_id == match_id).values(timeline_status="FETCHED")
            )
            
            # Enrichissement chirurgical du Hot Storage (Agrégations SQL futures)
            if metrics_dict:
                for puuid, m in metrics_dict.items():
                    await session.execute(
                        update(MatchParticipant)
                        .where(MatchParticipant.match_id == match_id)
                        .where(MatchParticipant.puuid == puuid)
                        .values(
                            gold_diff_15m=m.get("gold_diff_15m"),
                            xp_diff_15m=m.get("xp_diff_15m"),
                            is_snowballing=m.get("is_snowballing")
                        )
                    )
                    
            await session.commit()
            
        return {"status": "success", "match_id": match_id}

    except Exception as e:
        logger.error(f"Erreur Timeline sur {match_id}: {str(e)}")
        return {"status": "failed", "reason": str(e)}