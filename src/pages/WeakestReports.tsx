import { ReportList } from "../components/reports/ReportList";
import { SearchForm } from "../components/reports/SearchForm";
import type { ReportSearchParams, VillageReport } from "../types/report";
import styles from "./WeakestReports.module.css";

interface WeakestReportsProps {
  reports: VillageReport[];
  loading: boolean;
  error: string | null;
  usingMock: boolean;
  search: (params: ReportSearchParams) => void;
  playerName: string;
  limit: number;
  from: string;
  onPlayerNameChange: (value: string) => void;
  onLimitChange: (value: number) => void;
  onFromChange: (value: string) => void;
}

export function WeakestReports({
  reports,
  loading,
  error,
  usingMock,
  search,
  playerName,
  limit,
  from,
  onPlayerNameChange,
  onLimitChange,
  onFromChange,
}: WeakestReportsProps) {
  return (
    <div className={styles.page}>
      <SearchForm
        onSearch={search}
        loading={loading}
        playerName={playerName}
        limit={limit}
        from={from}
        onPlayerNameChange={onPlayerNameChange}
        onLimitChange={onLimitChange}
        onFromChange={onFromChange}
      />
      {usingMock && (
        <div className={styles.mockBanner}>
          &#9888; API indisponivel - exibindo dados de exemplo
        </div>
      )}
      <ReportList reports={reports} loading={loading} error={error} />
    </div>
  );
}
