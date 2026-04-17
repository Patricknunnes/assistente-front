import styles from "./DefenseBar.module.css";

interface DefenseBarProps {
  infantry: number;
  cavalry: number;
  archer: number;
  total: number;
}

export function DefenseBar({ infantry, cavalry, archer, total }: DefenseBarProps) {
  const pctInf = total > 0 ? (infantry / total) * 100 : 0;
  const pctCav = total > 0 ? (cavalry / total) * 100 : 0;
  const pctArc = total > 0 ? (archer / total) * 100 : 0;

  return (
    <div className={styles.container}>
      <div className={styles.bar}>
        <div
          className={styles.segment}
          style={{ width: `${pctInf}%`, background: "var(--color-infantry)" }}
          title={`Infantaria: ${pctInf.toFixed(1)}%`}
        />
        <div
          className={styles.segment}
          style={{ width: `${pctCav}%`, background: "var(--color-cavalry)" }}
          title={`Cavalaria: ${pctCav.toFixed(1)}%`}
        />
        <div
          className={styles.segment}
          style={{ width: `${pctArc}%`, background: "var(--color-archer)" }}
          title={`Arqueiro: ${pctArc.toFixed(1)}%`}
        />
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.dot} style={{ background: "var(--color-infantry)" }} />
          Inf {pctInf.toFixed(0)}%
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dot} style={{ background: "var(--color-cavalry)" }} />
          Cav {pctCav.toFixed(0)}%
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dot} style={{ background: "var(--color-archer)" }} />
          Arq {pctArc.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
