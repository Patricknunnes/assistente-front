import type { FormEvent } from "react";
import { VillageCard } from "../components/reports/VillageCard";
import type { VillageHistorySearchParams, VillageReport } from "../types/report";
import styles from "./VillageHistory.module.css";

interface VillageHistoryProps {
  reports: VillageReport[];
  loading: boolean;
  error: string | null;
  usingMock: boolean;
  search: (params: VillageHistorySearchParams) => void;
  coord: string;
  limit: number;
  onCoordChange: (value: string) => void;
  onLimitChange: (value: number) => void;
}

export function VillageHistory({
  reports,
  loading,
  error,
  usingMock,
  search,
  coord,
  limit,
  onCoordChange,
  onLimitChange,
}: VillageHistoryProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    search({ coord, limit });
  };

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <h2 className={styles.title}>Historico de Aldeia</h2>
        <p className={styles.description}>
          Consulte a evolucao dos relatorios de uma coordenada especifica.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="historyCoord">
              Coordenada
            </label>
            <input
              id="historyCoord"
              className={styles.input}
              type="text"
              value={coord}
              onChange={(event) => onCoordChange(event.target.value)}
              placeholder="Ex: 485|447"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="historyLimit">
              Limite
            </label>
            <input
              id="historyLimit"
              className={styles.input}
              type="number"
              min={1}
              max={100}
              value={limit}
              onChange={(event) => onLimitChange(Number(event.target.value))}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? "Buscando..." : "Buscar Historico"}
          </button>
        </div>
      </form>

      {usingMock && (
        <div className={styles.mockBanner}>
          &#9888; API indisponivel - exibindo dados de exemplo
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {reports.length > 0 && (
        <div className={styles.summary}>
          <span>
            {reports.length} relatorio{reports.length !== 1 ? "s" : ""} encontrado
            {reports.length !== 1 ? "s" : ""}
          </span>
          <span className={styles.summaryHint}>
            Ordem recebida do endpoint de historico
          </span>
        </div>
      )}

      {reports.length === 0 && !loading ? (
        <div className={styles.empty}>
          Use a coordenada da aldeia para consultar os relatorios anteriores.
        </div>
      ) : (
        <div className={styles.grid}>
          {reports.map((report, index) => (
            <VillageCard
              key={`${report.villageId ?? report.village}-${report.reportDate}-${index}`}
              report={report}
              rank={index + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
