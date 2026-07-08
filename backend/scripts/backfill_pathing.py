# -*- coding: utf-8 -*-
"""
===============================================================================
FICHIER : backend/scripts/backfill_pathing.py
PROJET  : JungleDiff

DESCRIPTION :
Script utilitaire de rattrapage (Backfill) pour l'extraction spatiale.
Parcourt toutes les parties disposant déjà d'une timeline en base de données, 
exécute le DataTrimmer pour récupérer les coordonnées (pos_f1_x à pos_f3_y),
et met à jour la table MatchParticipant. 

UTILISATION :
Exécuter depuis la racine du dossier backend :
$ PYTHONPATH=. python scripts/backfill_pathing.py
===============================================================================
"""

import asyncio
import logging
from sqlalchemy import select, update
from app.db.session import AsyncSessionLocal
from app.db.models import Match, MatchTimeline, MatchParticipant
from app.services.trimmer import DataTrimmer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("BackfillPathing")

async def run_backfill():
    async with AsyncSessionLocal() as session:
        # On cible uniquement les matchs dont la timeline est certifiée présente
        stmt = (
            select(Match.match_id, Match.raw_match_data, MatchTimeline.raw_timeline_data)
            .join(MatchTimeline, Match.match_id == MatchTimeline.match_id)
            .where(Match.timeline_status == 'FETCHED')
        )
        
        result = await session.execute(stmt)
        rows = result.all()
        
        total = len(rows)
        logger.info(f"Début du backfill sur {total} parties avec timeline...")
        
        updated_count = 0
        for row in rows:
            match_id = row.match_id
            match_data = row.raw_match_data
            timeline_data = row.raw_timeline_data
            
            # Extraction via la logique certifiée du Trimmer
            metrics_dict = DataTrimmer.extract_timeline_metrics(match_data, timeline_data)
            
            if metrics_dict:
                for puuid, m in metrics_dict.items():
                    # On ignore la mise à jour si aucune coordonnée spatiale n'a été trouvée (ex: AFK)
                    if m.get("pos_f1_x") is not None:
                        await session.execute(
                            update(MatchParticipant)
                            .where(MatchParticipant.match_id == match_id)
                            .where(MatchParticipant.puuid == puuid)
                            .values(
                                pos_f1_x=m.get("pos_f1_x"),
                                pos_f1_y=m.get("pos_f1_y"),
                                pos_f2_x=m.get("pos_f2_x"),
                                pos_f2_y=m.get("pos_f2_y"),
                                pos_f3_x=m.get("pos_f3_x"),
                                pos_f3_y=m.get("pos_f3_y")
                            )
                        )
                updated_count += 1

        await session.commit()
        logger.info(f"Backfill terminé ! {updated_count}/{total} parties mises à jour avec succès.")

if __name__ == "__main__":
    asyncio.run(run_backfill())