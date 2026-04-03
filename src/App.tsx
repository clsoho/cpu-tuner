import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { Dashboard } from './components/Dashboard';
import { PowerPlans } from './components/PowerPlans';
import { Monitor } from './components/Monitor';
import { Settings } from './components/CpuSettings';
import { useAppStore, PageType } from './stores/appStore';
import { api, isTauri } from './lib/tauri';

function App() {
  const { currentPage, setCpuInfo, setMetrics } = useAppStore();

  // Initial data fetch
  useEffect(() => {
    if (!isTauri()) return;

    api.getCpuInfo().then(setCpuInfo).catch(console.error);

    const fetchMetrics = () => {
      api.getSystemMetrics().then(setMetrics).catch(() => {});
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000);
    return () => clearInterval(interval);
  }, [setCpuInfo, setMetrics]);

  const renderPage = () => {
    const pages: Record<PageType, JSX.Element> = {
      dashboard: <Dashboard />,
      power: <PowerPlans />,
      monitor: <Monitor />,
      settings: <Settings />,
    };
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {pages[currentPage]}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-app)' }}>
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(59,130,246,0.04) 0%, transparent 60%)' }} />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
