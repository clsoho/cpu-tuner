import { useEffect, useState } from 'react'
import { useAppStore } from './stores/appStore'
import MainPanel from './components/MainPanel/index'
import FivrPanel from './components/FivrPanel/index'
import TplPanel from './components/TplPanel/index'
import TsBenchPanel from './components/TsBenchPanel/index'
import OptionsPanel from './components/OptionsPanel/index'
import Logo from './components/Logo/index'
import { listen } from '@tauri-apps/api/event'
import './styles/globals.css'

type Tab = 'main' | 'fivr' | 'tpl' | 'bench' | 'options'

export default function App() {
  const {
    fetchCpuInfo, fetchProfiles, startMonitoring,
    cpuInfo, metrics, toast, error,
  } = useAppStore()
  const [activeTab, setActiveTab] = useState<Tab>('main')

  useEffect(() => {
    fetchCpuInfo()
    fetchProfiles()
    startMonitoring()
    let unlisten: (() => void) | null = null
    const setupListener = async () => {
      unlisten = await listen('profiles-updated', () => fetchProfiles())
    }
    setupListener()
    return () => { if (unlisten) unlisten() }
  }, [])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'main', label: 'Main' },
    { key: 'fivr', label: 'FIVR' },
    { key: 'tpl', label: 'TPL' },
    { key: 'bench', label: 'Bench' },
    { key: 'options', label: 'Options' },
  ]

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-brand">
          <Logo size={20} animated />
          <span className="topbar-title">CPU TUNER</span>
        </div>
        <nav className="topbar-nav">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`nav-tab ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="topbar-metrics">
          {metrics && (
            <>
              <span className="metric-pill">
                <span className="metric-label">CPU</span>
                <span className={`metric-value ${metrics.cpu_usage_total > 80 ? 'hot' : metrics.cpu_usage_total > 50 ? 'warm' : 'cool'}`}>
                  {metrics.cpu_usage_total.toFixed(0)}%
                </span>
              </span>
              {metrics.cpu_temp_c != null && (
                <span className="metric-pill">
                  <span className="metric-label">TEMP</span>
                  <span className={`metric-value ${metrics.cpu_temp_c > 85 ? 'hot' : metrics.cpu_temp_c > 60 ? 'warm' : 'cool'}`}>
                    {metrics.cpu_temp_c.toFixed(0)}°C
                  </span>
                </span>
              )}
              <span className="metric-pill">
                <span className="metric-label">FREQ</span>
                <span className="metric-value">{metrics.cpu_freq_current_mhz.toFixed(0)} MHz</span>
              </span>
            </>
          )}
          {cpuInfo && (
            <span className="metric-pill" title={cpuInfo.name}>
              <span className="metric-label">CPU</span>
              <span className="metric-value" style={{fontSize:10, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                {cpuInfo.name.replace(/®/g,'').replace(/™/g,'').trim()}
              </span>
            </span>
          )}
        </div>
      </header>

      {toast && <div className="toast toast-ok">{toast}</div>}
      {error && <div className="toast toast-err">{error}</div>}

      <main className="app-content">
        {activeTab === 'main' && <MainPanel />}
        {activeTab === 'fivr' && <FivrPanel />}
        {activeTab === 'tpl' && <TplPanel />}
        {activeTab === 'bench' && <TsBenchPanel />}
        {activeTab === 'options' && <OptionsPanel />}
      </main>
    </div>
  )
}
