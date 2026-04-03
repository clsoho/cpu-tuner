import { invoke } from '@tauri-apps/api/core';

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function invokeWithLog<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error('不在 Tauri 环境中运行');
  }
  return invoke<T>(cmd, args);
}

// Types
export interface PowerPlan {
  guid: string;
  name: string;
  is_active: boolean;
}

export interface ProcessorPowerSettings {
  min_processor_state: number | null;
  max_processor_state: number | null;
  system_cooling_policy: number | null;
  processor_boost_mode: number | null;
}

export interface CpuInfo {
  name: string;
  cores_physical: number;
  cores_logical: number;
  base_freq_mhz: number | null;
  vendor: string;
}

export interface CpuCoreMetric {
  core_id: number;
  frequency_mhz: number;
  usage_percent: number;
}

export interface SystemMetrics {
  timestamp: number;
  cpu_usage_total: number;
  cpu_freq_current_mhz: number;
  cpu_freq_max_mhz: number;
  cpu_freq_min_mhz: number;
  cpu_temperature_c: number | null;
  cpu_cores: CpuCoreMetric[];
  memory_total_mb: number;
  memory_used_mb: number;
  memory_usage_percent: number;
}

// API
export const api = {
  // Power Plans
  getPowerPlans: () => invokeWithLog<PowerPlan[]>('get_power_plans'),
  getActivePowerPlan: () => invokeWithLog<PowerPlan>('get_active_power_plan'),
  setActivePowerPlan: (guid: string) => invokeWithLog<string>('set_active_power_plan', { guid }),
  createPowerPlan: (name: string, baseSchemeGuid: string) =>
    invokeWithLog<PowerPlan>('create_power_plan', { name, baseSchemeGuid }),
  deletePowerPlan: (guid: string) => invokeWithLog<string>('delete_power_plan', { guid }),
  getProcessorPowerSettings: (schemeGuid: string) =>
    invokeWithLog<ProcessorPowerSettings>('get_processor_power_settings', { schemeGuid }),
  setProcessorPowerSettings: (schemeGuid: string, settings: ProcessorPowerSettings) =>
    invokeWithLog<string>('set_processor_power_settings', { schemeGuid, settings }),

  // Monitor
  getCpuInfo: () => invokeWithLog<CpuInfo>('get_cpu_info'),
  getSystemMetrics: () => invokeWithLog<SystemMetrics>('get_system_metrics'),
};
