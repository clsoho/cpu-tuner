import { useEffect, useState } from 'react'
import { useAppStore } from './stores/appStore'
import Dashboard from './components/Dashboard'
import Profiles from './components/Profiles'
import PowerPlans from './components/PowerPlans'
import MonitorPage from './components/Monitor'
import * as api from './types'
import './styles/globals.css'

type Tab = 'dashboard' | 'profiles' | 'power' | 'monitor'

export default function App() {
  const { fetchCpuInfo, fetchProfiles, loading, fetchMetrics, startMonitoring, stopMonitoring, error, toast } = useAppStore()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  useEffect(() => {
    fetchCpuInfo()
    fetchProfiles()
  }, [])

  // Auto-start monitoring when viewing dashboard or monitor page
  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'monitor') {
      startMonitoring()
      return () => stopMonitoring()
    }
  }, [activeTab])

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'dashboard', label: '仪表板', icon: '🖥️' },
    { key: 'profiles', label: '配置', icon: '🎛️' },
    { key: 'power', label: '电源', icon: '🔋' },
    { key: 'monitor', label: '监控', icon: '📊' },
  ]

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <p>正在检测 CPU…</p>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <span className="app-logo">⚡</span>
          <h1>CPU Tuner</h1>
        </div>
        <nav className="app-nav">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`nav-btn ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              <span className="nav-icon">{t.icon}</span>
              <span className="nav-label">{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="header-right">
          <StatusBar />
        </div>
      </header>

      {/* Error Toast */}
      {error && <div className="error-toast">⚠️ {error}</div>}
      {toast && <div className="success-toast">✅ {toast}</div>}

      {/* Main Content */}
      <main className="app-content">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'profiles' && <Profiles />}
        {activeTab === 'power' && <PowerPlans />}
        {activeTab === 'monitor' && <MonitorPage />}
      </main>
    </div>
  )
}

function StatusBar() {
  const { metrics, cpuInfo } = useAppStore()
  return (
    <div className="status-bar">
      {metrics && (
        <>
          <span className="status-item">
            <span className="status-label">CPU</span>
            <span className={`status-value ${metrics.cpu_usage_total > 80 ? 'hot' : ''}`}>
              {metrics.cpu_usage_total.toFixed(0)}%
            </span>
          </span>
          {metrics.cpu_temp_c != null && (
            <span className="status-item">
              <span className="status-label">TEMP</span>
              <span className={`status-value ${metrics.cpu_temp_c > 80 ? 'hot' : ''}`}>
                {metrics.cpu_temp_c.toFixed(0)}°C
              </span>
            </span>
          )}
          <span className="status-item">
            <span className="status-label">FREQ</span>
            <span className="status-value">{metrics.cpu_freq_current_mhz.toFixed(0)} MHz</span>
          </span>
          <span className="status-item">
            <span className="status-label">RAM</span>
            <span className="status-value">{metrics.ram_usage_percent.toFixed(0)}%</span>
          </span>
        </>
      )}
      {cpuInfo && (
        <span className="status-cpu-name">{cpuInfo.name}</span>
      )}
    </div>
  )
}
