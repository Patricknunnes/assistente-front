import type { VillageReport } from "../../types/report";
import { formatDate, formatNumber } from "../../utils/format";
import { UNIT_INFO, UNIT_ORDER } from "../../utils/units";
import styles from "./SimpleReportTable.module.css";

interface SimpleReportTableProps {
  reports: VillageReport[];
  loading: boolean;
  error: string | null;
}

function formatUnits(report: VillageReport): string {
  return UNIT_ORDER.filter((unit) => (report.units[unit] ?? 0) > 0)
    .map((unit) => `${UNIT_INFO[unit].label}: ${formatNumber(report.units[unit] ?? 0)}`)
    .join(" | ");
}

export function SimpleReportTable({
  reports,
  loading,
  error,
}: SimpleReportTableProps) {
  if (loading) {
    return <div className={styles.status}>Buscando aldeias...</div>;
  }

  if (error) {
    return <div className={styles.status}>{error}</div>;
  }

  if (reports.length === 0) {
    return (
      <div className={styles.status}>
        Use o filtro acima para listar as aldeias vulneraveis desse player.
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.summary}>
        <span>
          {reports.length} aldeia{reports.length !== 1 ? "s" : ""} encontrada
          {reports.length !== 1 ? "s" : ""}
        </span>
        <span className={styles.summaryHint}>
          Lista pronta para abrir aldeia por aldeia
        </span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Coord</th>
              <th>Unidades</th>
              <th>Relatorio</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={`${report.villageId ?? report.village}-${report.reportDate}`}>
                <td className={styles.coord}>{report.village}</td>
                <td className={styles.units}>{formatUnits(report)}</td>
                <td>{formatDate(report.reportDate)}</td>
                <td>
                  {report.villageUrl ? (
                    <a
                      className={styles.link}
                      href={report.villageUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir
                    </a>
                  ) : (
                    <span className={styles.noLink}>Sem link</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
