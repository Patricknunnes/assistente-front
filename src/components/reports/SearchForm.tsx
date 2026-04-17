import { FormEvent, useState } from "react";
import type { ReportSearchParams } from "../../types/report";
import { toDatetimeLocal } from "../../utils/format";
import styles from "./SearchForm.module.css";

interface SearchFormProps {
  onSearch: (params: ReportSearchParams) => void;
  loading: boolean;
}

function getDefaultFrom(): string {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return toDatetimeLocal(date);
}

export function SearchForm({ onSearch, loading }: SearchFormProps) {
  const [playerName, setPlayerName] = useState("otavio10ta");
  const [limit, setLimit] = useState(10);
  const [from, setFrom] = useState(getDefaultFrom);

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
            onChange={(e) => setPlayerName(e.target.value)}
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
            onChange={(e) => setLimit(Number(e.target.value))}
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
            onChange={(e) => setFrom(e.target.value)}
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
