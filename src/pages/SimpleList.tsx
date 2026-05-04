import { SimpleReportTable } from "../components/reports/SimpleReportTable";
import { SearchForm } from "../components/reports/SearchForm";
import type { ReportSearchParams, VillageReport } from "../types/report";
import styles from "./SimpleList.module.css";

interface SimpleListProps {
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

export function SimpleList({
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
}: SimpleListProps) {
  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <h2 className={styles.title}>Lista Simples de Aldeias</h2>
        <p className={styles.description}>
          Visualizacao tabulada para filtrar um player e abrir as aldeias uma a uma.
        </p>
      </div>

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

      <SimpleReportTable reports={reports} loading={loading} error={error} />
    </div>
  );
}
