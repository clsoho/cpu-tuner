import { useEffect, useState } from 'react'
import { useAppStore } from './stores/appStore'
import { useI18n } from './stores/i18n'
import MainPanel from './components/MainPanel/index'
import FivrPanel from './components/FivrPanel/index'
import TplPanel from './components/TplPanel/index'
import TsBenchPanel from './components/TsBenchPanel/index'
import OptionsPanel from './components/OptionsPanel/index'
import Logo from './components/Logo/index'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import './styles/globals.css'

type Tab = 'main' | 'fivr' | 'tpl' | 'bench' | 'options'

export default function App() {
  const {
    fetchCpuInfo, fetchProfiles, startMonitoring,
    cpuInfo, metrics, toast, error,
  } = useAppStore()
  const { t, lang, toggleLang } = useI18n()
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
    { key: 'main', label: 'tab.main' },
    { key: 'fivr', label: 'tab.fivr' },
    { key: 'tpl', label: 'tab.tpl' },
    { key: 'bench', label: 'tab.bench' },
    { key: 'options', label: 'tab.options' },
  ]

  const handleMinimize = () => { getCurrentWindow().minimize() }
  const handleClose = () => { getCurrentWindow().close() }

  return (
    <div className="app">
      <header className="topbar" data-tauri-drag-region>
        <div className="topbar-brand">
          <Logo size={22} />
          <span className="topbar-title">{t('app.title')}</span>
        </div>
        <nav className="topbar-nav">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`nav-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {t(tab.label)}
            </button>
          ))}
        </nav>
        <div className="topbar-right">
          <div className="topbar-metrics">
            {metrics && (
              <>
                <span className="metric-pill">
                  <span className="metric-label">{t('topbar.cpu')}</span>
                  <span className={`metric-value ${metrics.cpu_usage_total > 80 ? 'hot' : metrics.cpu_usage_total > 50 ? 'warm' : 'cool'}`}>
                    {metrics.cpu_usage_total.toFixed(0)}%
                  </span>
                </span>
                {metrics.cpu_temp_c != null && (
                  <span className="metric-pill">
                    <span className="metric-label">{t('topbar.temp')}</span>
                    <span className={`metric-value ${metrics.cpu_temp_c > 85 ? 'hot' : metrics.cpu_temp_c > 60 ? 'warm' : 'cool'}`}>
                      {metrics.cpu_temp_c.toFixed(0)}°C
                    </span>
                  </span>
                )}
                <span className="metric-pill">
                  <span className="metric-label">{t('topbar.freq')}</span>
                  <span className="metric-value">{metrics.cpu_freq_current_mhz.toFixed(0)} MHz</span>
                </span>
                {metrics.package_power_w != null && (
                  <span className="metric-pill">
                    <span className="metric-label">{t('topbar.power')}</span>
                    <span className="metric-value">{metrics.package_power_w.toFixed(1)}W</span>
                  </span>
                )}
              </>
            )}
            {cpuInfo && (
              <span className="metric-pill" title={cpuInfo.name}>
                <span className="metric-label">CPU</span>
                <span className="metric-value" style={{fontSize:11, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                  {cpuInfo.name.replace(/®/g,'').replace(/™/g,'').trim()}
                </span>
              </span>
            )}
          </div>
          <button className="lang-toggle" onClick={toggleLang}>
            {lang === 'zh' ? 'EN' : '中'}
          </button>
          <div className="win-controls">
            <button className="win-btn win-btn-min" onClick={handleMinimize} title="Minimize">
              <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="5.5" width="10" height="1" rx="0.5" fill="currentColor"/></svg>
            </button>
            <button className="win-btn win-btn-close" onClick={handleClose} title="Close">
              <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            </button>
          </div>
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
