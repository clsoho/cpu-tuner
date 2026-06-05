import { create } from 'zustand'
import * as api from '../types'
import { emit } from '@tauri-apps/api/event'

interface AppState {
  cpuInfo: api.CpuInfo | null
  metrics: api.SystemSnapshot | null
  metricsHistory: api.CoreMetric[][]
  monitoring: boolean
  profileConfig: api.ProfileConfig | null
  tplSettings: api.TplSettings
  fivrData: api.FivrData
  optionsFivrOpen: boolean
  optionsTplOpen: boolean
  optionsBenchOpen: boolean
  optionsSettingsOpen: boolean
  loading: boolean
  error: string | null
  toast: string | null

  fetchCpuInfo: () => Promise<void>
  fetchMetrics: () => Promise<void>
  startMonitoring: () => void
  stopMonitoring: () => void
  fetchProfiles: () => Promise<void>
  applyProfile: (id: number) => Promise<void>
  updateProfile: (profile: api.Profile) => Promise<void>
  setFivrOpen: (v: boolean) => void
  setTplOpen: (v: boolean) => void
  setBenchOpen: (v: boolean) => void
  setSettingsOpen: (v: boolean) => void
  showToast: (msg: string) => void
}

let monitorInterval: ReturnType<typeof setInterval> | null = null

export const useAppStore = create<AppState>((set, get) => ({
  cpuInfo: null,
  metrics: null,
  metricsHistory: [],
  monitoring: false,
  profileConfig: null,
  tplSettings: {
    power_limit_long_w: null,
    power_limit_short_w: null,
    turbo_time_window_s: null,
    mmio_lock: false,
    sync_mmio: false,
  },
  fivrData: {
    core_offset_mv: null,
    cache_offset_mv: null,
    gpu_offset_mv: null,
    system_agent_offset_mv: null,
    core_voltage_mv: null,
    cache_voltage_mv: null,
  },
  optionsFivrOpen: false,
  optionsTplOpen: false,
  optionsBenchOpen: false,
  optionsSettingsOpen: false,
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
        if (history.length > 120) history.shift()
        return { metrics: m, metricsHistory: history }
      })
    } catch {
      // silently drop
    }
  },

  startMonitoring: () => {
    if (monitorInterval) return
    set({ monitoring: true })
    get().fetchMetrics()
    monitorInterval = setInterval(() => get().fetchMetrics(), 1000)
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
      emit('profiles-updated')
      set({ toast: msg })
      setTimeout(() => set({ toast: null }), 3000)
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

  setFivrOpen: (v) => set({ optionsFivrOpen: v }),
  setTplOpen: (v) => set({ optionsTplOpen: v }),
  setBenchOpen: (v) => set({ optionsBenchOpen: v }),
  setSettingsOpen: (v) => set({ optionsSettingsOpen: v }),

  showToast: (msg) => {
    set({ toast: msg })
    setTimeout(() => set({ toast: null }), 3000)
  },
}))
