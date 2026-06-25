"""
===============================================================================
FICHIER : backend/app/worker/tasks.py
PROJET  : JungleDiff

DESCRIPTION :
Logique métier exécutée en arrière-plan par les workers ARQ.
Reçoit désormais uniquement des matchs garantis (inédits et compétitifs).
===============================================================================
"""

import logging
from sqlalchemy.dialects.postgresql import insert
from app.db.session import AsyncSessionLocal
from app.db.models import Match, MatchTimeline, Player, MatchParticipant
from app.services.riot_client import RiotClient
from app.services.trimmer import DataTrimmer

logger = logging.getLogger("JungleDiffWorker")

async def process_match_ingestion(ctx, match_id: str, continent: str):
    riot_client: RiotClient = ctx["riot_client"]
    
    try:
        # 1. Téléchargement Brut (Détails)
        match_data = await riot_client.get_match_details(continent, match_id)
        if not match_data or "info" not in match_data:
            return {"status": "failed", "reason": "Données de match invalides"}
            
        queue_id = match_data["info"].get("queueId")
        if queue_id not in [420, 440, 400, 490]:
            return {"status": "skipped", "reason": f"Mode de jeu ignoré ({queue_id})"}

        # 2. Téléchargement Brut (Timeline)
        timeline_data = await riot_client.get_match_timeline(continent, match_id)
        if not timeline_data:
            return {"status": "failed", "reason": "Timeline indisponible"}

        # 3. Élagage chirurgical (Trimming)
        trimmed_match = DataTrimmer.trim_match_details(match_data)
        trimmed_timeline = DataTrimmer.trim_match_timeline(timeline_data)
        
        info = trimmed_match["info"]
        
        # 4. Insertion en Base de Données
        async with AsyncSessionLocal() as session:
            # Upsert du Match
            stmt_match = insert(Match).values(
                match_id=match_id,
                game_version=info.get("gameVersion", "Unknown"),
                game_duration=info.get("gameDuration", 0),
                creation_timestamp=info.get("gameCreation", 0),
                raw_match_data=trimmed_match
            ).on_conflict_do_nothing(index_elements=['match_id'])
            await session.execute(stmt_match)
            
            # Upsert de la Timeline
            stmt_timeline = insert(MatchTimeline).values(
                match_id=match_id,
                raw_timeline_data=trimmed_timeline
            ).on_conflict_do_nothing(index_elements=['match_id'])
            await session.execute(stmt_timeline)

            # Upsert des Participants
            participants = info.get("participants", [])
            
            # SOLUTION ANTI-DEADLOCK : Tri par PUUID
            participants = sorted(participants, key=lambda x: x.get("puuid", ""))
            
            for p in participants:
                puuid = p.get("puuid")
                if not puuid:
                    continue
                    
                stmt_player = insert(Player).values(
                    puuid=puuid,
                    riot_id_name=p.get("riotIdGameName", "Inconnu"),
                    riot_id_tagline=p.get("riotIdTagline", "")
                ).on_conflict_do_update(
                    index_elements=['puuid'],
                    set_=dict(
                        riot_id_name=p.get("riotIdGameName", "Inconnu"),
                        riot_id_tagline=p.get("riotIdTagline", "")
                    )
                )
                await session.execute(stmt_player)

                stmt_participant = insert(MatchParticipant).values(
                    match_id=match_id,
                    puuid=puuid,
                    team_id=p.get("teamId", 0),
                    champion_id=p.get("championId", 0),
                    lane=p.get("teamPosition", "NONE"),
                    position=p.get("teamPosition", "NONE"),
                    win=p.get("win", False),
                    kills=p.get("kills", 0),
                    deaths=p.get("deaths", 0),
                    assists=p.get("assists", 0)
                ).on_conflict_do_nothing(constraint='uix_match_puuid')
                await session.execute(stmt_participant)

            await session.commit()
            
        return {"status": "success", "match_id": match_id}

    except Exception as e:
        logger.error(f"Erreur inattendue sur {match_id}: {str(e)}")
        return {"status": "failed", "reason": str(e)}
    
async def process_timeline_only(ctx, match_id: str, continent: str):
    """
    Tâche chirurgicale déclenchée à la volée (P0/P1) lors de l'ouverture d'une MatchCard.
    Ne télécharge et n'ingère QUE la timeline.
    """
    riot_client: RiotClient = ctx["riot_client"]
    
    try:
        # Vérification anti-doublon direct dans le worker par sécurité
        async with AsyncSessionLocal() as session:
            existing_timeline = await session.get(MatchTimeline, match_id)
            if existing_timeline:
                return {"status": "skipped", "reason": "Timeline déjà présente en base"}

        timeline_data = await riot_client.get_match_timeline(continent, match_id)
        if not timeline_data:
            return {"status": "failed", "reason": "Timeline indisponible chez Riot"}

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