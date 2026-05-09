import type { MouseEvent } from "react";
import styles from "./Header.module.css";

interface HeaderProps {
  pathname: string;
  onNavigate: (path: string) => void;
}

export function Header({ pathname, onNavigate }: HeaderProps) {
  const handleNavigate =
    (path: string) => (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      onNavigate(path);
    };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.icon}>&#9876;</span>
          <div>
            <h1 className={styles.title}>Tribal Wars Assistant</h1>
            <p className={styles.subtitle}>Inteligencia de Guerra</p>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Navegacao principal">
          <a
            className={pathname === "/" ? styles.navLinkActive : styles.navLink}
            href="/"
            onClick={handleNavigate("/")}
          >
            Cards
          </a>
          <a
            className={
              pathname === "/simple-list" ? styles.navLinkActive : styles.navLink
            }
            href="/simple-list"
            onClick={handleNavigate("/simple-list")}
          >
            Lista Simples
          </a>
          <a
            className={
              pathname === "/defensive-list" ? styles.navLinkActive : styles.navLink
            }
            href="/defensive-list"
            onClick={handleNavigate("/defensive-list")}
          >
            Lista de Aldeias Ofensivas
          </a>
          <a
            className={
              pathname === "/village-history" ? styles.navLinkActive : styles.navLink
            }
            href="/village-history"
            onClick={handleNavigate("/village-history")}
          >
            Historico de Aldeia
          </a>
        </nav>
      </div>
    </header>
  );
}
