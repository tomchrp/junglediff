"""
===============================================================================
FICHIER : backend/app/services/analysis/synergy_orchestrator.py
PROJET  : JungleDiff

DESCRIPTION :
Moteur d'analyse croisée calculant les métriques de synergies et de matchups.

MODIFICATIONS :
- Ajout de l'argument `player_champion_id` dans la méthode get_player_matchups.
- Injection dynamique d'une clause conditionnelle WHERE dans la requête SQL
  d'extraction des matchs initiaux du joueur pour filtrer sur son champion actif.
===============================================================================
"""
from typing import Dict, Any, Optional
from sqlalchemy import select, desc, func, cast, Integer, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import MatchParticipant, Match, MVCommunityMatchups, MVCommunitySynergies

class SynergyOrchestrator:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_player_matchups(
        self, 
        puuid: str, 
        role: str, 
        analysis_type: str, 
        limit: Optional[int] = None,
        player_champion_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Calcule les statistiques croisées d'un joueur contre ou avec le reste du pool de champions.
        
        Cette méthode complexe effectue une extraction par cercles concentriques :
        1. Elle isole les identifiants de parties du joueur correspondant à sa lane et,
           si spécifié, restreint l'analyse aux parties où il a joué un champion précis.
        2. Elle cartographie les champions cohabitants (alliés ou ennemis) de ces matchs.
        3. Elle interroge les Vues Matérialisées communautaires sur les couples exacts découverts.
        4. Elle fusionne les chronologies temporelles pour renvoyer un état comparatif symétrique.
        """
        
        # 1. Parties du joueur : on récupère team_id, champion_id et on calcule le bucket
        player_query = (
            select(
                MatchParticipant.match_id, 
                MatchParticipant.win,
                MatchParticipant.team_id,
                MatchParticipant.champion_id.label('player_champ'),
                cast(func.floor(Match.game_duration / 300.0) * 5, Integer).label('duration_bucket')
            )
            .join(Match, MatchParticipant.match_id == Match.match_id)
            .where(MatchParticipant.puuid == puuid)
            .where(MatchParticipant.lane == role)
            .where(Match.game_duration > 0)
        )
        
        # APPLICATION DU FILTRE DE LA SIDEBAR (Résolution de la désynchronisation)
        if player_champion_id:
            player_query = player_query.where(MatchParticipant.champion_id == player_champion_id)
            
        player_query = player_query.order_by(desc(Match.creation_timestamp))
        
        if limit:
            player_query = player_query.limit(limit)

        player_result = await self.db.execute(player_query)
        player_matches = player_result.fetchall()

        empty_payload = { "TOP": [], "JUNGLE": [], "MIDDLE": [], "BOTTOM": [], "UTILITY": [] }

        if not player_matches:
            return empty_payload

        match_ids = [row.match_id for row in player_matches]
        player_match_map = {
            row.match_id: {
                "win": row.win, 
                "team_id": row.team_id, 
                "bucket": row.duration_bucket,
                "player_champ": row.player_champ
            } 
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
        experienced_pairs = set()
        
        for part in other_participants:
            m_data = player_match_map[part.match_id]
            is_ally = (part.team_id == m_data["team_id"])
            
            if analysis_type == "SYNERGIES" and not is_ally: continue
            if analysis_type == "MATCHUPS" and is_ally: continue
            
            part_lane = part.lane
            if part_lane not in local_stats: continue
                
            champ_id = part.champion_id
            player_champ_id = m_data["player_champ"]
            
            experienced_pairs.add((player_champ_id, champ_id, part_lane))
            
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

        if not experienced_pairs:
            return empty_payload

        # 4. Extraction du Référentiel Communautaire ciblé sur les couples découverts
        Model = MVCommunitySynergies if analysis_type == "SYNERGIES" else MVCommunityMatchups
        
        pair_conditions = [
            and_(
                Model.subject_champion_id == p_champ,
                Model.target_champion_id == t_champ,
                Model.target_lane == t_lane
            ) for p_champ, t_champ, t_lane in experienced_pairs
        ]

        global_stats_query = (
            select(Model)
            .where(Model.subject_lane == role)
            .where(or_(*pair_conditions))
        )
        
        global_result = await self.db.execute(global_stats_query)
        global_rows = global_result.scalars().all()

        global_stats_map = {}
        for row in global_rows:
            t_lane = row.target_lane
            t_champ = row.target_champion_id
            b = row.duration_bucket
            
            if t_lane not in global_stats_map:
                global_stats_map[t_lane] = {}
            
            if t_champ not in global_stats_map[t_lane]:
                global_stats_map[t_lane][t_champ] = {}
                
            if b not in global_stats_map[t_lane][t_champ]:
                global_stats_map[t_lane][t_champ][b] = {"matches": 0, "wins": 0}
            
            global_stats_map[t_lane][t_champ][b]["matches"] += row.matches_count
            global_stats_map[t_lane][t_champ][b]["wins"] += row.wins_count

        # 5. Assemblage du Payload Final structuré par Lane
        payload = { "TOP": [], "JUNGLE": [], "MIDDLE": [], "BOTTOM": [], "UTILITY": [] }
        
        for lane_key, lane_dict in local_stats.items():
            for champ_id, p_stats in lane_dict.items():
                player_global_wr = (p_stats["total_wins"] / p_stats["total_matches"]) * 100
                
                combined_timeline = []
                g_stats = global_stats_map.get(lane_key, {}).get(champ_id, {})
                all_buckets = sorted(set(p_stats["buckets"].keys()).union(g_stats.keys()))
                
                total_global_matches = 0
                total_global_wins = 0
                
                for b in all_buckets:
                    g_bucket_matches = g_stats.get(b, {}).get("matches", 0)
                    g_bucket_wins = g_stats.get(b, {}).get("wins", 0)
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
            payload[lane_key].sort(key=lambda x: x["player_stats"]["matches"], reverse=True)

        return payload