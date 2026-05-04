import styles from "./Header.module.css";

export function Header() {
  const pathname = window.location.pathname;

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
          >
            Cards
          </a>
          <a
            className={
              pathname === "/simple-list" ? styles.navLinkActive : styles.navLink
            }
            href="/simple-list"
          >
            Lista Simples
          </a>
        </nav>
      </div>
    </header>
  );
}
