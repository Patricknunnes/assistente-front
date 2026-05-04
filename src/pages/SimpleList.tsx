import { SimpleReportTable } from "../components/reports/SimpleReportTable";
import { SearchForm } from "../components/reports/SearchForm";
import { useReports } from "../hooks/useReports";
import styles from "./SimpleList.module.css";

export function SimpleList() {
  const { reports, loading, error, usingMock, search } = useReports();

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <h2 className={styles.title}>Lista Simples de Aldeias</h2>
        <p className={styles.description}>
          Visualizacao tabulada para filtrar um player e abrir as aldeias uma a uma.
        </p>
      </div>

      <SearchForm onSearch={search} loading={loading} />

      {usingMock && (
        <div className={styles.mockBanner}>
          &#9888; API indisponivel - exibindo dados de exemplo
        </div>
      )}

      <SimpleReportTable reports={reports} loading={loading} error={error} />
    </div>
  );
}
