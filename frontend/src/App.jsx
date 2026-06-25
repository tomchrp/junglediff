import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SearchBar from './components/SearchBar.jsx';
import PlayerStatCard from './components/sidebar/PlayerStatCard.jsx';
import ChampionStatCard from './components/sidebar/ChampionStatCard.jsx';
import FilterBar from './components/FilterBar.jsx';
import MatchList from './components/history/MatchList.jsx';

function App() {
  const [currentPuuid, setCurrentPuuid] = useState(null);
  const [currentServer, setCurrentServer] = useState('EUW'); // Serveur mémorisé
  const [playerSummary, setPlayerSummary] = useState(null);

  const [laneFilter, setLaneFilter] = useState('ALL');
  const [patchFilter, setPatchFilter] = useState('ALL');

  const [championStats, setChampionStats] = useState([]);
  const [selectedChampion, setSelectedChampion] = useState(null);
  const [championMap, setChampionMap] = useState({});
  const [versionDDragon, setVersionDDragon] = useState('14.12.1');

  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const initDataDragon = async () => {
      try {
        const versionRes = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
        const latestVersion = versionRes.data[0];
        setVersionDDragon(latestVersion);

        const ddragonRes = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/fr_FR/champion.json`);
        const champData = ddragonRes.data.data;
        const map = {};
        for (const key in champData) { map[champData[key].key] = champData[key].id; }
        setChampionMap(map);
      } catch (error) { console.error("Erreur DataDragon:", error); }
    };
    initDataDragon();
  }, []);

  const handleSearch = async (server, gameName, tagLine) => {
    setIsSyncing(true);
    setErrorMsg(null);
    setPlayerSummary(null);
    setCurrentServer(server); // On garde en mémoire pour la redirection de clic

    try {
      const updateRes = await axios.post('http://localhost:8000/api/v1/players/update', {
        server, game_name: gameName, tag_line: tagLine
      });
      const puuid = updateRes.data.puuid;
      setCurrentPuuid(puuid);

      const summaryRes = await axios.get(`http://localhost:8000/api/v1/players/${puuid}/summary`);
      setPlayerSummary(summaryRes.data);
    } catch (error) {
      setErrorMsg(error.response?.data?.detail || "Erreur de connexion au serveur.");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!currentPuuid) return;
    const fetchStats = async () => {
      setIsLoadingStats(true);
      try {
        let url = `http://localhost:8000/api/v1/players/${currentPuuid}/champion-stats?`;
        if (laneFilter !== 'ALL') url += `lane=${laneFilter}&`;
        if (patchFilter !== 'ALL') url += `patch=${patchFilter}`;

        const statsRes = await axios.get(url);
        let newStats = statsRes.data.championStats;

        newStats.sort((a, b) => {
          if (b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed;
          if (b.winrate !== a.winrate) return b.winrate - a.winrate;
          return (championMap[a.championId] || "").localeCompare(championMap[b.championId] || "");
        });

        setChampionStats(newStats);

        if (newStats.length > 0) {
          if (!newStats.some(stat => stat.championId === selectedChampion)) {
            setSelectedChampion(newStats[0].championId);
          }
        } else setSelectedChampion(null);
      } catch (error) { console.error("Erreur stats:", error); }
      finally { setIsLoadingStats(false); }
    };
    fetchStats();
  }, [currentPuuid, laneFilter, patchFilter, championMap]);

  useEffect(() => {
    // Si on vient de charger un joueur depuis la base de données...
    if (playerSummary && !isSyncing) {
      const now = Date.now();
      const diff = now - playerSummary.lastUpdate;

      // Si la date de mise à jour date de plus de 120 secondes (2 minutes)
      if (diff > 120 * 1000) {
        console.log("Les données profil ont plus de 2 minutes, auto-update silencieux déclenché.");
        // On fait une requête POST sans vider les states (ce qui évite que l'interface clignote)
        axios.post('http://localhost:8000/api/v1/players/update', {
          server: currentServer,
          game_name: playerSummary.riotIdGameName,
          tag_line: playerSummary.riotIdTagline
        }).then(() => {
          console.log("Auto-update silencieux terminé. Le worker ARQ traite l'historique.");
          // Le composant MatchList devra être averti pour refaire un fetch.
        }).catch(err => console.error("Échec auto-update:", err));
      }
    }
  }, [playerSummary]);
  
  return (
    // FIX LAYOUT : h-screen et overflow-hidden bloquent la page globale
    <div className="h-screen bg-lol-dark p-6 overflow-hidden flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 flex-1 min-h-0">

        <SearchBar onSearch={handleSearch} isSyncing={isSyncing} />

        {errorMsg && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded shrink-0">
            {errorMsg}
          </div>
        )}

        {currentPuuid && playerSummary && (
          <div className="flex gap-6 items-start flex-1 min-h-0">

            {/* Colonne Gauche : Restreinte et scrollable indépendamment */}
            <div className="w-80 shrink-0 flex flex-col gap-6 h-full">
              <PlayerStatCard
                summary={playerSummary}
                onUpdate={() => handleSearch(currentServer, playerSummary.riotIdGameName, playerSummary.riotIdTagline)}
                isSyncing={isSyncing}
              />

              <div className="bg-lol-blue border border-lol-border rounded p-3 shadow-lg flex flex-col flex-1 min-h-0">
                <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider text-center border-b border-lol-border pb-2 shrink-0">
                  Champions Joués
                </h3>

                <div className="overflow-y-auto pr-1 custom-scrollbar flex-1">
                  {isLoadingStats ? (
                    <div className="text-center text-gray-400 py-4 text-sm">Chargement...</div>
                  ) : championStats.length === 0 ? (
                    <div className="text-center text-gray-400 py-4 text-sm">Aucune donnée.</div>
                  ) : (
                    championStats.map((stat) => {
                      const champName = championMap[stat.championId] || "Inconnu";
                      return (
                        <ChampionStatCard
                          key={stat.championId}
                          championName={champName}
                          gamesPlayed={stat.gamesPlayed}
                          wins={stat.wins}
                          winrate={stat.winrate}
                          isSelected={selectedChampion === stat.championId}
                          onClick={() => setSelectedChampion(selectedChampion === stat.championId ? null : stat.championId)}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Colonne Droite : Layout vertical */}
            <div className="flex-1 flex flex-col gap-6 h-full min-w-0">
              <div className="shrink-0">
                <FilterBar currentLane={laneFilter} currentPatch={patchFilter} onLaneChange={setLaneFilter} onPatchChange={setPatchFilter} />
              </div>

              {/* Conteneur Historique flexible et scrollable géré dans MatchList */}
              <MatchList
                playerPuuid={currentPuuid}
                laneFilter={laneFilter}
                patchFilter={patchFilter}
                selectedChampion={selectedChampion}
                versionDDragon={versionDDragon}
                championMap={championMap}
                currentServer={currentServer}
                onPlayerSearch={handleSearch}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;