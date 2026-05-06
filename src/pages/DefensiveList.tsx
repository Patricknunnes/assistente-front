import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { getDefaultFrom } from "../components/reports/SearchForm";
import type { VillageCoordSearchParams } from "../types/report";
import styles from "./DefensiveList.module.css";

interface DefensiveListProps {
  villages: string[];
  loading: boolean;
  error: string | null;
  usingMock: boolean;
  search: (params: VillageCoordSearchParams) => void;
  playerName: string;
  from: string;
  onPlayerNameChange: (value: string) => void;
  onFromChange: (value: string) => void;
}

export function DefensiveList({
  villages,
  loading,
  error,
  usingMock,
  search,
  playerName,
  from,
  onPlayerNameChange,
  onFromChange,
}: DefensiveListProps) {
  const [copied, setCopied] = useState(false);

  const textValue = useMemo(() => villages.join("\n"), [villages]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    search({
      playerName: playerName.trim() || undefined,
      from: from.trim() || undefined,
    });
  };

  const handleCopy = async () => {
    if (!textValue) return;

    await navigator.clipboard.writeText(textValue);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <h2 className={styles.title}>Aldeias Para Copiar no Mapa</h2>
        <p className={styles.description}>
          Busca opcional por player e data, com a saida pronta para copiar e colar.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="coordPlayerName">
              Nome do Jogador
            </label>
            <input
              id="coordPlayerName"
              className={styles.input}
              type="text"
              value={playerName}
              onChange={(event) => onPlayerNameChange(event.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="coordFrom">
              A partir de
            </label>
            <input
              id="coordFrom"
              className={styles.input}
              type="datetime-local"
              value={from}
              onChange={(event) => onFromChange(event.target.value)}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.searchButton} type="submit" disabled={loading}>
            {loading ? "Buscando..." : "Gerar Lista"}
          </button>
        </div>
      </form>

      {usingMock && (
        <div className={styles.mockBanner}>
          &#9888; API indisponivel - exibindo dados de exemplo
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.outputCard}>
        <div className={styles.outputHeader}>
          <div>
            <span className={styles.outputLabel}>Coordenadas</span>
            <p className={styles.outputMeta}>
              {villages.length} aldeia{villages.length !== 1 ? "s" : ""} listada
              {villages.length !== 1 ? "s" : ""}
            </p>
          </div>

          <button
            className={styles.copyButton}
            type="button"
            onClick={handleCopy}
            disabled={!textValue}
          >
            <span className={styles.copyIcon} aria-hidden="true">
              &#128203;
            </span>
            {copied ? "Copiado!" : "Copiar tudo"}
          </button>
        </div>

        <textarea
          className={styles.output}
          value={textValue}
          readOnly
          placeholder={[
            "485|446",
            "484|446",
            "484|447",
            "485|449",
            "485|450",
          ].join("\n")}
        />
      </section>
    </div>
  );
}

export function getDefaultCoordFrom(): string {
  return getDefaultFrom();
}
