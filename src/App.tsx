import { useCallback, useEffect, useState } from "react";
import { Header } from "./components/common/Header";
import { getDefaultFrom } from "./components/reports/SearchForm";
import { useReports } from "./hooks/useReports";
import { useVillageHistory } from "./hooks/useVillageHistory";
import { useVillageCoords } from "./hooks/useVillageCoords";
import { DefensiveList, getDefaultCoordFrom } from "./pages/DefensiveList";
import { SimpleList } from "./pages/SimpleList";
import { VillageHistory } from "./pages/VillageHistory";
import { WeakestReports } from "./pages/WeakestReports";
import type {
  ReportSearchParams,
  VillageCoordSearchParams,
  VillageHistorySearchParams,
} from "./types/report";
import styles from "./App.module.css";

function App() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [playerName, setPlayerName] = useState("otavio10ta");
  const [limit, setLimit] = useState(10);
  const [from, setFrom] = useState(getDefaultFrom);
  const [coordPlayerName, setCoordPlayerName] = useState("");
  const [coordFrom, setCoordFrom] = useState(getDefaultCoordFrom);
  const [historyCoord, setHistoryCoord] = useState("485|447");
  const [historyLimit, setHistoryLimit] = useState(10);
  const { reports, loading, error, usingMock, search } = useReports();
  const {
    reports: historyReports,
    loading: historyLoading,
    error: historyError,
    usingMock: historyUsingMock,
    search: searchHistory,
  } = useVillageHistory();
  const {
    villages,
    loading: coordsLoading,
    error: coordsError,
    usingMock: coordsUsingMock,
    search: searchCoords,
  } = useVillageCoords();
  const isSimpleList = pathname === "/simple-list";
  const isDefensiveList = pathname === "/defensive-list";
  const isVillageHistory = pathname === "/village-history";

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleNavigate = useCallback(
    (path: string) => {
      if (path === pathname) return;
      window.history.pushState({}, "", path);
      setPathname(path);
    },
    [pathname]
  );

  const handleSearch = useCallback(
    (params: ReportSearchParams) => {
      setPlayerName(params.playerName);
      setLimit(params.limit);
      setFrom(params.from);
      search(params);
    },
    [search]
  );

  const handleCoordSearch = useCallback(
    (params: VillageCoordSearchParams) => {
      setCoordPlayerName(params.playerName ?? "");
      setCoordFrom(params.from ?? "");
      searchCoords(params);
    },
    [searchCoords]
  );

  const handleHistorySearch = useCallback(
    (params: VillageHistorySearchParams) => {
      setHistoryCoord(params.coord);
      setHistoryLimit(params.limit);
      searchHistory(params);
    },
    [searchHistory]
  );

  const sharedPageProps = {
    reports,
    loading,
    error,
    usingMock,
    search: handleSearch,
    playerName,
    limit,
    from,
    onPlayerNameChange: setPlayerName,
    onLimitChange: setLimit,
    onFromChange: setFrom,
  };

  const defensivePageProps = {
    villages,
    loading: coordsLoading,
    error: coordsError,
    usingMock: coordsUsingMock,
    search: handleCoordSearch,
    playerName: coordPlayerName,
    from: coordFrom,
    onPlayerNameChange: setCoordPlayerName,
    onFromChange: setCoordFrom,
  };

  const historyPageProps = {
    reports: historyReports,
    loading: historyLoading,
    error: historyError,
    usingMock: historyUsingMock,
    search: handleHistorySearch,
    coord: historyCoord,
    limit: historyLimit,
    onCoordChange: setHistoryCoord,
    onLimitChange: setHistoryLimit,
  };

  return (
    <div className={styles.app}>
      <Header pathname={pathname} onNavigate={handleNavigate} />
      <main className={styles.main}>
        {isVillageHistory ? (
          <VillageHistory {...historyPageProps} />
        ) : isDefensiveList ? (
          <DefensiveList {...defensivePageProps} />
        ) : isSimpleList ? (
          <SimpleList {...sharedPageProps} />
        ) : (
          <WeakestReports {...sharedPageProps} />
        )}
      </main>
    </div>
  );
}

export default App;
