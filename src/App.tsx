import { Header } from "./components/common/Header";
import { SimpleList } from "./pages/SimpleList";
import { WeakestReports } from "./pages/WeakestReports";
import styles from "./App.module.css";

function App() {
  const pathname = window.location.pathname;
  const isSimpleList = pathname === "/simple-list";

  return (
    <div className={styles.app}>
      <Header />
      <main className={styles.main}>
        {isSimpleList ? <SimpleList /> : <WeakestReports />}
      </main>
    </div>
  );
}

export default App;
