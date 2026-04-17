import styles from "./Header.module.css";

export function Header() {
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
      </div>
    </header>
  );
}
