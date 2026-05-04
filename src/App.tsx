import { useCallback, useEffect, useState } from "react";
import { Header } from "./components/common/Header";
import { getDefaultFrom } from "./components/reports/SearchForm";
import { useReports } from "./hooks/useReports";
import { SimpleList } from "./pages/SimpleList";
import { WeakestReports } from "./pages/WeakestReports";
import type { ReportSearchParams } from "./types/report";
import styles from "./App.module.css";

function App() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [playerName, setPlayerName] = useState("otavio10ta");
  const [limit, setLimit] = useState(10);
  const [from, setFrom] = useState(getDefaultFrom);
  const { reports, loading, error, usingMock, search } = useReports();
  const isSimpleList = pathname === "/simple-list";

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

  return (
    <div className={styles.app}>
      <Header pathname={pathname} onNavigate={handleNavigate} />
      <main className={styles.main}>
        {isSimpleList ? (
          <SimpleList {...sharedPageProps} />
        ) : (
          <WeakestReports {...sharedPageProps} />
        )}
      </main>
    </div>
  );
}

export default App;
