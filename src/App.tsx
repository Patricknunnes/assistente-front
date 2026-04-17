import { Header } from "./components/common/Header";
import { WeakestReports } from "./pages/WeakestReports";
import styles from "./App.module.css";

function App() {
  return (
    <div className={styles.app}>
      <Header />
      <main className={styles.main}>
        <WeakestReports />
      </main>
    </div>
  );
}

export default App;
