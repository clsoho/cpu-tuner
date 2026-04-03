import { create } from 'zustand';
import type { PowerPlan, ProcessorPowerSettings, CpuInfo, SystemMetrics } from '../lib/tauri';

interface AppState {
  // Power plans
  powerPlans: PowerPlan[];
  activePlanGuid: string | null;
  currentSettings: ProcessorPowerSettings | null;
  setPowerPlans: (plans: PowerPlan[]) => void;
  setActivePlanGuid: (guid: string | null) => void;
  setCurrentSettings: (s: ProcessorPowerSettings | null) => void;

  // CPU
  cpuInfo: CpuInfo | null;
  setCpuInfo: (info: CpuInfo | null) => void;

  // Metrics
  metrics: SystemMetrics | null;
  metricsHistory: SystemMetrics[];
  setMetrics: (m: SystemMetrics) => void;

  // UI
  currentPage: PageType;
  setCurrentPage: (p: PageType) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}

export type PageType = 'dashboard' | 'power' | 'monitor' | 'settings';

const MAX_HISTORY = 60; // Keep 60 data points

export const useAppStore = create<AppState>((set, get) => ({
  powerPlans: [],
  activePlanGuid: null,
  currentSettings: null,
  setPowerPlans: (plans) => set({ powerPlans: plans }),
  setActivePlanGuid: (guid) => set({ activePlanGuid: guid }),
  setCurrentSettings: (s) => set({ currentSettings: s }),

  cpuInfo: null,
  setCpuInfo: (info) => set({ cpuInfo: info }),

  metrics: null,
  metricsHistory: [],
  setMetrics: (m) => {
    const history = get().metricsHistory;
    const newHistory = history.length >= MAX_HISTORY
      ? [...history.slice(1), m]
      : [...history, m];
    set({ metrics: m, metricsHistory: newHistory });
  },

  currentPage: 'dashboard',
  setCurrentPage: (p) => set({ currentPage: p }),
  loading: false,
  setLoading: (v) => set({ loading: v }),
}));
