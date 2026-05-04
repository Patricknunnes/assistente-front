import type { FormEvent } from "react";
import type { ReportSearchParams } from "../../types/report";
import { toDatetimeLocal } from "../../utils/format";
import styles from "./SearchForm.module.css";

interface SearchFormProps {
  onSearch: (params: ReportSearchParams) => void;
  loading: boolean;
  playerName: string;
  limit: number;
  from: string;
  onPlayerNameChange: (value: string) => void;
  onLimitChange: (value: number) => void;
  onFromChange: (value: string) => void;
}

export function getDefaultFrom(): string {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return toDatetimeLocal(date);
}

export function SearchForm({
  onSearch,
  loading,
  playerName,
  limit,
  from,
  onPlayerNameChange,
  onLimitChange,
  onFromChange,
}: SearchFormProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch({ playerName, limit, from });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.fields}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="playerName">
            Nome do Jogador
          </label>
          <input
            id="playerName"
            className={styles.input}
            type="text"
            value={playerName}
            onChange={(e) => onPlayerNameChange(e.target.value)}
            placeholder="Ex: otavio10ta"
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="limit">
            Limite
          </label>
          <input
            id="limit"
            className={styles.input}
            type="number"
            min={1}
            max={100}
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="from">
            A partir de
          </label>
          <input
            id="from"
            className={styles.input}
            type="datetime-local"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? (
            <span className={styles.spinner} />
          ) : (
            <span>&#9876;</span>
          )}
          {loading ? "Buscando..." : "Buscar Alvos"}
        </button>
      </div>
    </form>
  );
}
