import { ReportList } from "../components/reports/ReportList";
import { SearchForm } from "../components/reports/SearchForm";
import { useReports } from "../hooks/useReports";
import styles from "./WeakestReports.module.css";

export function WeakestReports() {
  const { reports, loading, error, usingMock, search } = useReports();

  return (
    <div className={styles.page}>
      <SearchForm onSearch={search} loading={loading} />
      {usingMock && (
        <div className={styles.mockBanner}>
          &#9888; API indisponivel - exibindo dados de exemplo
        </div>
      )}
      <ReportList reports={reports} loading={loading} error={error} />
    </div>
  );
}
