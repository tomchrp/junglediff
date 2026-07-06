"""
===============================================================================
FICHIER : backend/app/services/analysis/synergy_orchestrator.py
===============================================================================
"""
from typing import Dict, Any
from sqlalchemy import select, desc, func, cast, Integer
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import MatchParticipant, Match, GlobalChampionTimeStats

class SynergyOrchestrator:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_player_matchups(self, puuid: str, role: str, analysis_type: str, limit: int = None) -> Dict[str, Any]:
        
        # 1. Parties du joueur : on récupère team_id et on calcule le bucket
        player_query = (
            select(
                MatchParticipant.match_id, 
                MatchParticipant.win,
                MatchParticipant.team_id,
                cast(func.floor(Match.game_duration / 300.0) * 5, Integer).label('duration_bucket')
            )
            .join(Match, MatchParticipant.match_id == Match.match_id)
            .where(MatchParticipant.puuid == puuid)
            .where(MatchParticipant.lane == role)
            .where(Match.game_duration > 0)
            .order_by(desc(Match.creation_timestamp))
        )
        
        if limit:
            player_query = player_query.limit(limit)

        player_result = await self.db.execute(player_query)
        player_matches = player_result.fetchall()

        # Structure canonique attendue par le Frontend (LaneGrid)
        empty_payload = { "TOP": [], "JUNGLE": [], "MIDDLE": [], "BOTTOM": [], "UTILITY": [] }

        if not player_matches:
            return empty_payload

        match_ids = [row.match_id for row in player_matches]
        player_match_map = {
            row.match_id: {"win": row.win, "team_id": row.team_id, "bucket": row.duration_bucket} 
            for row in player_matches
        }

        # 2. Récupération des participants avec inclusion obligatoire de la LANE
        opponents_query = (
            select(MatchParticipant.match_id, MatchParticipant.champion_id, MatchParticipant.team_id, MatchParticipant.lane)
            .where(MatchParticipant.match_id.in_(match_ids))
            .where(MatchParticipant.puuid != puuid)
        )
        opponents_result = await self.db.execute(opponents_query)
        other_participants = opponents_result.fetchall()

        # 3. Filtrage et Groupement Multi-Dimensionnel (Par Lane -> Par Champion -> Par Bucket)
        local_stats = { "TOP": {}, "JUNGLE": {}, "MIDDLE": {}, "BOTTOM": {}, "UTILITY": {} }
        target_champions = set()
        
        for part in other_participants:
            m_data = player_match_map[part.match_id]
            is_ally = (part.team_id == m_data["team_id"])
            
            if analysis_type == "SYNERGIES" and not is_ally: continue
            if analysis_type == "MATCHUPS" and is_ally: continue
            
            part_lane = part.lane
            # Ignorer les modes de jeux sans lane définie (ARAM) ou les données corrompues
            if part_lane not in local_stats: continue
                
            champ_id = part.champion_id
            target_champions.add(champ_id)
            
            if champ_id not in local_stats[part_lane]:
                local_stats[part_lane][champ_id] = {"total_matches": 0, "total_wins": 0, "buckets": {}}
                
            local_stats[part_lane][champ_id]["total_matches"] += 1
            if m_data["win"]:
                local_stats[part_lane][champ_id]["total_wins"] += 1
                
            b = m_data["bucket"]
            if b not in local_stats[part_lane][champ_id]["buckets"]:
                local_stats[part_lane][champ_id]["buckets"][b] = {"matches": 0, "wins": 0}
            
            local_stats[part_lane][champ_id]["buckets"][b]["matches"] += 1
            if m_data["win"]:
                local_stats[part_lane][champ_id]["buckets"][b]["wins"] += 1

        if not target_champions:
            return empty_payload

        # 4. Extraction du Référentiel Communautaire
        global_stats_query = (
            select(GlobalChampionTimeStats)
            .where(GlobalChampionTimeStats.champion_id.in_(list(target_champions)))
        )
        global_result = await self.db.execute(global_stats_query)
        global_rows = global_result.scalars().all()

        global_stats_map = {}
        for row in global_rows:
            c_id = row.champion_id
            if c_id not in global_stats_map:
                global_stats_map[c_id] = {}
            
            if row.duration_bucket not in global_stats_map[c_id]:
                global_stats_map[c_id][row.duration_bucket] = {"matches": 0, "wins_count": 0}
            
            global_stats_map[c_id][row.duration_bucket]["matches"] += row.matches_count
            global_stats_map[c_id][row.duration_bucket]["wins_count"] += row.wins_count

        # 5. Assemblage du Payload Final structuré par Lane
        payload = { "TOP": [], "JUNGLE": [], "MIDDLE": [], "BOTTOM": [], "UTILITY": [] }
        
        for lane_key, lane_dict in local_stats.items():
            for champ_id, p_stats in lane_dict.items():
                player_global_wr = (p_stats["total_wins"] / p_stats["total_matches"]) * 100
                
                combined_timeline = []
                g_stats = global_stats_map.get(champ_id, {})
                all_buckets = sorted(set(p_stats["buckets"].keys()).union(g_stats.keys()))
                
                total_global_matches = 0
                total_global_wins = 0
                
                for b in all_buckets:
                    g_bucket_matches = g_stats.get(b, {}).get("matches", 0)
                    g_bucket_wins = g_stats.get(b, {}).get("wins_count", 0)
                    g_bucket_wr = (g_bucket_wins / g_bucket_matches * 100) if g_bucket_matches > 0 else 0
                    
                    total_global_matches += g_bucket_matches
                    total_global_wins += g_bucket_wins
                    
                    p_bucket = p_stats["buckets"].get(b)
                    p_bucket_wr = None
                    p_bucket_matches = 0
                    p_bucket_wins = 0
                    if p_bucket:
                        p_bucket_matches = p_bucket["matches"]
                        p_bucket_wins = p_bucket["wins"]
                        p_bucket_wr = round((p_bucket_wins / p_bucket_matches) * 100, 1)
                    
                    combined_timeline.append({
                        "bucket": b,
                        "global_winrate": round(g_bucket_wr, 1),
                        "global_matches": g_bucket_matches,
                        "player_winrate": p_bucket_wr,
                        "player_matches": p_bucket_matches,
                        "player_wins": p_bucket_wins
                    })
                    
                global_wr = (total_global_wins / total_global_matches * 100) if total_global_matches > 0 else 50
                
                payload[lane_key].append({
                    "champion_id": champ_id,
                    "player_stats": {
                        "matches": p_stats["total_matches"],
                        "wins": p_stats["total_wins"],
                        "winrate": round(player_global_wr, 1),
                        "delta": round(player_global_wr - global_wr, 1)
                    },
                    "timeline": combined_timeline
                })
            # Tri interne pour chaque lane
            payload[lane_key].sort(key=lambda x: x["player_stats"]["matches"], reverse=True)

        return payload