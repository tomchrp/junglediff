import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import SearchBar from './components/SearchBar.jsx';
import ViewSelector from './components/ViewSelector.jsx';
import PlayerStatCard from './components/sidebar/PlayerStatCard.jsx';
import ChampionStatCard from './components/sidebar/ChampionStatCard.jsx';
import FilterBar from './components/FilterBar.jsx';
import MatchList from './components/history/MatchList.jsx';
import SynergiesMatchupsWrapper from './components/synergies/SynergiesMatchupsWrapper.jsx';
import ChatView from './components/chat/ChatView.jsx';
import { addProfileToHistory } from './services/historyService.js';
import GlobalChampionsView from './components/global/GlobalChampionsView.jsx';
import GlobalDuosView from './components/global/GlobalDuosView.jsx';

function App() {
  const { view: urlView, server: urlServer, riotId: urlRiotId } = useParams();
  const navigate = useNavigate();

  const [currentPuuid, setCurrentPuuid] = useState(null);
  const [currentServer, setCurrentServer] = useState('EUW');
  const [playerSummary, setPlayerSummary] = useState(null);
  const [currentMainView, setCurrentMainView] = useState('HISTORIQUE');

  // États de filtrage partagés
  const [laneFilter, setLaneFilter] = useState('ALL');
  const [patchFilter, setPatchFilter] = useState('ALL');

  // NOUVEAUX ÉTATS : Dédiés à la vue Synergies
  const [timeFilter, setTimeFilter] = useState('recent');
  const [recentCount, setRecentCount] = useState(20);

  // NOUVEAUX ÉTATS : Dédiés à la vue Meta Duos
  const [primaryLane, setPrimaryLane] = useState('JUNGLE');
  const [secondaryLane, setSecondaryLane] = useState('ALL');

  const [championStats, setChampionStats] = useState([]);
  const [selectedChampion, setSelectedChampion] = useState(null);
  const [championMap, setChampionMap] = useState({});
  const [versionDDragon, setVersionDDragon] = useState('14.12.1');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isPollingBackground, setIsPollingBackground] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const lastIngestedCount = useRef(0);

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
      } catch (error) {
        console.error("Erreur DataDragon:", error);
      }
    };
    initDataDragon();
  }, []);

  useEffect(() => {
    if (urlView) {
      const upperView = urlView.toUpperCase();
      if (upperView !== currentMainView) {
        setCurrentMainView(upperView);
      }
    }
  }, [urlView, currentMainView]);

  useEffect(() => {
    if (urlServer && urlRiotId) {
      const lastDashIndex = urlRiotId.lastIndexOf('-');
      if (lastDashIndex === -1) {
        setErrorMsg("Format d'URL invalide. Utilisez Pseudo-Tag.");
        return;
      }

      const gameName = urlRiotId.substring(0, lastDashIndex);
      const tagLine = urlRiotId.substring(lastDashIndex + 1);

      if (playerSummary &&
        playerSummary.riotIdGameName.toLowerCase() === gameName.toLowerCase() &&
        playerSummary.riotIdTagline.toLowerCase() === tagLine.toLowerCase() &&
        currentServer.toLowerCase() === urlServer.toLowerCase()) {
        return;
      }

      handleSearch(urlServer, gameName, tagLine);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlServer, urlRiotId]);

  const handleSearch = async (server, gameName, tagLine) => {
    setIsSyncing(true);
    setErrorMsg(null);
    setPlayerSummary(null);
    setCurrentServer(server);
    setLaneFilter('ALL');
    setPatchFilter('ALL');
    setSelectedChampion(null);
    lastIngestedCount.current = 0;

    try {
      const updateRes = await axios.post('http://localhost:8000/api/v1/players/update', {
        server, game_name: gameName, tag_line: tagLine
      });
      const puuid = updateRes.data.puuid;
      setCurrentPuuid(puuid);

      const summaryRes = await axios.get(`http://localhost:8000/api/v1/players/${puuid}/summary`);
      setPlayerSummary(summaryRes.data);

      addProfileToHistory(server, gameName, tagLine);

      setIsPollingBackground(true);
      setIsInitialLoading(true);
    } catch (error) {
      setErrorMsg(error.response?.data?.detail || "Erreur de connexion au serveur.");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!currentPuuid || !isPollingBackground) return;
    let pollInterval;

    const checkStatus = async () => {
      try {
        const res = await axios.get(`http://localhost:8000/api/v1/players/${currentPuuid}/sync-status`);
        const { status, matches_ingested } = res.data;

        if (matches_ingested >= 5 || status === "completed") {
          setIsInitialLoading(false);
        }

        if (matches_ingested > lastIngestedCount.current) {
          lastIngestedCount.current = matches_ingested;
          setRefreshTrigger(prev => prev + 1);
        }

        if (status === "completed") {
          setIsPollingBackground(false);
        }
      } catch (err) {
        console.warn("Attente du statut ARQ...");
      }
    };

    checkStatus();
    pollInterval = setInterval(checkStatus, 3000);
    return () => clearInterval(pollInterval);
  }, [currentPuuid, isPollingBackground]);

  useEffect(() => {
    if (!currentPuuid) return;
    const abortController = new AbortController();

    const fetchStats = async () => {
      if (championStats.length === 0) setIsLoadingStats(true);
      try {
        let url = `http://localhost:8000/api/v1/players/${currentPuuid}/champion-stats?`;
        if (laneFilter !== 'ALL') url += `lane=${laneFilter}&`;
        if (patchFilter !== 'ALL') url += `patch=${patchFilter}`;

        const statsRes = await axios.get(url, { signal: abortController.signal });
        let newStats = statsRes.data.championStats;

        newStats.sort((a, b) => {
          if (b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed;
          if (b.winrate !== a.winrate) return b.winrate - a.winrate;
          return (championMap[a.championId] || "").localeCompare(championMap[b.championId] || "");
        });

        setChampionStats(newStats);

        if (selectedChampion && !newStats.some(stat => stat.championId === selectedChampion)) {
          setSelectedChampion(null);
        }
      } catch (error) {
        if (!axios.isCancel(error)) console.error("Erreur stats:", error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
    return () => abortController.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPuuid, laneFilter, patchFilter, championMap, refreshTrigger, selectedChampion]);

  useEffect(() => {
    if (playerSummary && !isSyncing) {
      const now = Date.now();
      const diff = now - playerSummary.lastUpdate;

      if (diff > 120 * 1000) {
        axios.post('http://localhost:8000/api/v1/players/update', {
          server: currentServer,
          game_name: playerSummary.riotIdGameName,
          tag_line: playerSummary.riotIdTagline
        }).then(() => {
          setIsPollingBackground(true);
        }).catch(err => console.error("Échec auto-update:", err));
      }
    }
  }, [playerSummary, currentServer, isSyncing]);

  const handleViewChange = (newView) => {
    if (!playerSummary) return;

    if (newView === 'HISTORIQUE') {
      setLaneFilter('ALL');
      setPatchFilter('ALL');
    } else if (newView === 'SYNERGIES' && laneFilter === 'ALL') {
      const defaultLane = playerSummary?.preferredLane || 'JUNGLE';
      setLaneFilter(defaultLane);
    } else if (newView === 'META_DUOS') {
      // Réinitialisation par défaut à l'ouverture de la vue
      setPrimaryLane('JUNGLE');
      setSecondaryLane('ALL');
    }

    const safeRiotId = `${playerSummary.riotIdGameName}-${playerSummary.riotIdTagline}`;
    navigate(`/${newView.toLowerCase()}/${currentServer.toLowerCase()}/${safeRiotId}`);
  };

  return (
    <div className="h-screen p-6 overflow-hidden flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 flex-1 min-h-0">

        <SearchBar isSyncing={isSyncing} />

        {errorMsg && (
          <div className="bg-surface-solid border border-lol-loss text-red-200 p-4 rounded-lg shrink-0">
            {errorMsg}
          </div>
        )}

        {currentPuuid && playerSummary && (
          <ViewSelector
            currentView={currentMainView}
            onViewChange={handleViewChange}
          />
        )}

        {currentPuuid && playerSummary && (
          <div className="flex gap-6 items-start flex-1 min-h-0">

            <div className="w-80 shrink-0 flex flex-col gap-6 max-h-full">
              <PlayerStatCard
                summary={playerSummary}
                onUpdate={() => handleSearch(currentServer, playerSummary.riotIdGameName, playerSummary.riotIdTagline)}
                isSyncing={isSyncing}
                versionDDragon={versionDDragon}
              />

              <div className="glass-panel p-3 flex flex-col min-h-0 overflow-hidden">
                <h3 className="text-gray-100 font-bold mb-3 text-sm uppercase tracking-wider text-center border-b border-border-glass pb-2 shrink-0">
                  Champions Joués
                </h3>
                <div className="overflow-y-auto pr-1 custom-scrollbar">
                  {isLoadingStats ? (
                    <div className="text-center text-lol-textMuted py-4 text-sm font-medium">Analyse en cours...</div>
                  ) : championStats.length === 0 ? (
                    <div className="text-center text-lol-textMuted py-4 text-sm italic">Aucune donnée disponible.</div>
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
                          versionDDragon={versionDDragon}
                          isSelected={selectedChampion === stat.championId}
                          onClick={() => setSelectedChampion(selectedChampion === stat.championId ? null : stat.championId)}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-6 h-full min-w-0">
              <div className="shrink-0 z-40">
                <FilterBar
                  puuid={currentPuuid}
                  currentLane={laneFilter}
                  currentPatch={patchFilter}
                  onLaneChange={setLaneFilter}
                  onPatchChange={setPatchFilter}
                  refreshTrigger={refreshTrigger}

                  // Injections conditionnelles
                  {...(currentMainView === 'SYNERGIES' ? {
                    timeFilter: timeFilter,
                    onTimeFilterChange: setTimeFilter,
                    recentCount: recentCount,
                    onRecentCountChange: setRecentCount
                  } : {})}

                  {...(currentMainView === 'META_DUOS' ? {
                    isMetaDuosMode: true,
                    primaryLane: primaryLane,
                    secondaryLane: secondaryLane,
                    onPrimaryChange: setPrimaryLane,
                    onSecondaryChange: setSecondaryLane
                  } : {})}
                />
              </div>

              {currentMainView === 'HISTORIQUE' && (
                <MatchList
                  playerPuuid={currentPuuid}
                  laneFilter={laneFilter}
                  patchFilter={patchFilter}
                  selectedChampion={selectedChampion}
                  versionDDragon={versionDDragon}
                  championMap={championMap}
                  currentServer={currentServer}
                  onPlayerSearch={(s, g, t) => navigate(`/historique/${s.toLowerCase()}/${g}-${t}`)}
                  isInitialLoading={isInitialLoading}
                  refreshTrigger={refreshTrigger}
                />
              )}

              {currentMainView === 'SYNERGIES' && (
                <SynergiesMatchupsWrapper
                  puuid={currentPuuid}
                  laneFilter={laneFilter}
                  timeFilter={timeFilter}
                  recentCount={recentCount}
                  versionDDragon={versionDDragon}
                  championMap={championMap}
                  selectedChampion={selectedChampion}
                />
              )}

              {currentMainView === 'ASSISTANT_IA' && (
                <ChatView puuid={currentPuuid} matches={[]} />
              )}

              {currentMainView === 'ANALYSE_GLOBALE' && (
                <GlobalChampionsView
                  versionDDragon={versionDDragon}
                  championMap={championMap}
                />
              )}

              {/* NOUVELLE VUE : Explorateur Meta Duos */}
              {currentMainView === 'META_DUOS' && (
                <GlobalDuosView
                  primaryLane={primaryLane}
                  secondaryLane={secondaryLane}
                  versionDDragon={versionDDragon}
                  championMap={championMap}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;