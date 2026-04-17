import type { VillageReport } from "../../types/report";
import { VillageCard } from "./VillageCard";
import styles from "./ReportList.module.css";

interface ReportListProps {
  reports: VillageReport[];
  loading: boolean;
  error: string | null;
}

export function ReportList({ reports, loading, error }: ReportListProps) {
  if (loading) {
    return (
      <div className={styles.status}>
        <div className={styles.loadingGrid}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.status}>
        <div className={styles.error}>
          <span className={styles.errorIcon}>&#9888;</span>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className={styles.status}>
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>&#9876;</span>
          <h3>Nenhum alvo encontrado</h3>
          <p>Use o formulario acima para buscar aldeias vulneraveis</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.summary}>
        <span>
          {reports.length} aldeia{reports.length !== 1 ? "s" : ""} encontrada
          {reports.length !== 1 ? "s" : ""}
        </span>
        <span className={styles.sortHint}>
          Ordenado por defesa (mais fraca primeiro)
        </span>
      </div>
      <div className={styles.grid}>
        {reports.map((report, index) => (
          <VillageCard
            key={`${report.village}-${report.reportDate}`}
            report={report}
            rank={index + 1}
          />
        ))}
      </div>
    </div>
  );
}
