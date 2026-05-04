import type { VillageReport } from "../../types/report";
import { formatDate, formatNumber } from "../../utils/format";
import { getUnitIconUrl, UNIT_INFO, UNIT_ORDER } from "../../utils/units";
import { DefenseBar } from "./DefenseBar";
import styles from "./VillageCard.module.css";

interface VillageCardProps {
  report: VillageReport;
  rank: number;
}

function getThreatLevel(total: number): { label: string; className: string } {
  if (total < 1_000_000) return { label: "Fraca", className: styles.threatLow };
  if (total < 5_000_000) return { label: "Moderada", className: styles.threatMedium };
  if (total < 10_000_000) return { label: "Forte", className: styles.threatHigh };
  return { label: "Fortaleza", className: styles.threatMax };
}

export function VillageCard({ report, rank }: VillageCardProps) {
  const threat = getThreatLevel(report.totalDefenseScore);
  const activeUnits = UNIT_ORDER.filter((unit) => (report.units[unit] ?? 0) > 0);

  return (
    <div className={styles.card} style={{ animationDelay: `${rank * 0.08}s` }}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.rank}>#{rank}</span>
          <div>
            {report.villageUrl ? (
              <a
                className={styles.villageLink}
                href={report.villageUrl}
                target="_blank"
                rel="noreferrer"
                title="Abrir aldeia no Tribal Wars"
              >
                <div className={styles.village}>{report.village}</div>
              </a>
            ) : (
              <div className={styles.village}>{report.village}</div>
            )}
            <div className={styles.player}>{report.player}</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={`${styles.threat} ${threat.className}`}>
            {threat.label}
          </span>
          {report.wallLevel !== null && (
            <span className={styles.structure} title="Nivel da Muralha">
              &#127984; {report.wallLevel}
            </span>
          )}
          {report.towerLevel !== null && report.towerLevel !== undefined && (
            <span className={styles.structure} title="Nivel da Torre">
              &#128508; {report.towerLevel}
            </span>
          )}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.defenseSection}>
          <div className={styles.totalDefense}>
            <span className={styles.defenseLabel}>Defesa Total</span>
            <span className={styles.defenseValue}>
              {formatNumber(report.totalDefenseScore)}
            </span>
          </div>
          <DefenseBar
            infantry={report.infantryDefenseScore}
            cavalry={report.cavalryDefenseScore}
            archer={report.archerDefenseScore}
            total={report.totalDefenseScore}
          />
          <div className={styles.defenseBreakdown}>
            <div className={styles.defenseItem}>
              <span>Infantaria</span>
              <strong>{formatNumber(report.infantryDefenseScore)}</strong>
            </div>
            <div className={styles.defenseItem}>
              <span>Cavalaria</span>
              <strong>{formatNumber(report.cavalryDefenseScore)}</strong>
            </div>
            <div className={styles.defenseItem}>
              <span>Arqueiro</span>
              <strong>{formatNumber(report.archerDefenseScore)}</strong>
            </div>
          </div>
        </div>

        <div className={styles.unitsSection}>
          <span className={styles.unitsSectionTitle}>Tropas</span>
          <div className={styles.unitsGrid}>
            {activeUnits.map((unit) => (
              <div key={unit} className={styles.unitItem}>
                <img
                  className={styles.unitIcon}
                  src={getUnitIconUrl(unit)}
                  alt={UNIT_INFO[unit].label}
                  loading="lazy"
                />
                <span className={styles.unitCount}>
                  {formatNumber(report.units[unit] ?? 0)}
                </span>
                <span className={styles.unitName}>
                  {UNIT_INFO[unit].label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <span className={styles.date}>
          &#128197; {formatDate(report.reportDate)}
        </span>
      </div>
    </div>
  );
}
