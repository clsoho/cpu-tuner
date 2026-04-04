import { create } from 'zustand'
import * as api from '../types'

interface AppState {
  // CPU Info
  cpuInfo: api.CpuInfo | null
  // Live Metrics
  metrics: api.SystemSnapshot | null
  metricsHistory: api.CoreMetric[][]
  monitoring: boolean
  // Profiles
  profileConfig: api.ProfileConfig | null
  // Status
  loading: boolean
  error: string | null
  toast: string | null
  // Actions
  fetchCpuInfo: () => Promise<void>
  fetchMetrics: () => Promise<void>
  startMonitoring: () => void
  stopMonitoring: () => void
  fetchProfiles: () => Promise<void>
  applyProfile: (id: number) => Promise<void>
  updateProfile: (profile: api.Profile) => Promise<void>
  showToast: (msg: string) => void
}

let monitorInterval: ReturnType<typeof setInterval> | null = null

export const useAppStore = create<AppState>((set, get) => ({
  cpuInfo: null,
  metrics: null,
  metricsHistory: [],
  monitoring: false,
  profileConfig: null,
  loading: true,
  error: null,
  toast: null,

  fetchCpuInfo: async () => {
    try {
      const info = await api.getCpuInfo()
      set({ cpuInfo: info, loading: false, error: null })
    } catch (err: any) {
      set({ error: err?.message || '获取 CPU 信息失败', loading: false })
    }
  },

  fetchMetrics: async () => {
    try {
      const m = await api.getSystemMetrics()
      set((s) => {
        const history = [...s.metricsHistory, m.cores]
        // Keep last 120 samples (2 min at 1s interval)
        if (history.length > 120) history.shift()
        return { metrics: m, metricsHistory: history }
      })
    } catch {
      // Silently drop metric errors during monitoring
    }
  },

  startMonitoring: () => {
    if (monitorInterval) return
    set({ monitoring: true })
    // Fetch immediately
    get().fetchMetrics()
    monitorInterval = setInterval(() => {
      get().fetchMetrics()
    }, 1000)
  },

  stopMonitoring: () => {
    if (monitorInterval) {
      clearInterval(monitorInterval)
      monitorInterval = null
    }
    set({ monitoring: false })
  },

  fetchProfiles: async () => {
    try {
      const config = await api.getProfiles()
      set({ profileConfig: config })
    } catch (err: any) {
      set({ error: err?.message || '获取配置失败' })
    }
  },

  applyProfile: async (id: number) => {
    try {
      const msg = await api.applyProfile(id)
      set({ toast: msg })
      setTimeout(() => set({ toast: null }), 3000)
      // Refresh profiles to get active state
      get().fetchProfiles()
    } catch (err: any) {
      set({ error: err?.message || '应用配置失败' })
      setTimeout(() => set({ error: null }), 5000)
    }
  },

  updateProfile: async (profile: api.Profile) => {
    try {
      await api.updateProfile(profile)
      set({ toast: '配置已保存' })
      setTimeout(() => set({ toast: null }), 3000)
      get().fetchProfiles()
    } catch (err: any) {
      set({ error: err?.message || '保存配置失败' })
    }
  },

  showToast: (msg: string) => {
    set({ toast: msg })
    setTimeout(() => set({ toast: null }), 3000)
  },
}))
