// ==================== Tauri invoke 封装 ====================
import { invoke } from '@tauri-apps/api/core'

// ========== Types ==========

export interface CpuInfo {
  name: string
  vendor: string
  family: number
  model: number
  stepping: number
  cores_physical: number
  cores_logical: number
  base_freq_mhz: number
  max_freq_mhz: number
  has_speed_shift: boolean
  has_turbo_boost: boolean
  architecture: string
}

export interface CoreMetric {
  thread_id: number
  usage_percent: number
  frequency_mhz: number
  temperature_c: number | null
}

export interface SystemSnapshot {
  timestamp_ms: number
  cpu_usage_total: number
  cpu_threads: number
  cpu_freq_current_mhz: number
  cpu_temp_c: number | null
  cores: CoreMetric[]
  ram_total_mb: number
  ram_used_mb: number
  ram_usage_percent: number
}

export interface PowerPlan {
  guid: string
  name: string
  is_active: boolean
}

export interface ProcessorPowerSettings {
  min_processor_state: number | null
  max_processor_state: number | null
  system_cooling_policy: number | null
  processor_boost_mode: number | null
}

export interface PowerSchemeDetails {
  scheme_guid: string
  processor: ProcessorPowerSettings
}

export interface Profile {
  id: number
  name: string
  icon: string
  power_plan_guid: string | null
  min_processor_state: number | null
  max_processor_state: number | null
  system_cooling_policy: number | null
  processor_boost_mode: number | null
  speed_shift_epp: number | null
  undervolt_core_mv: number | null
  undervolt_cache_mv: number | null
  undervolt_gpu_mv: number | null
  power_limit_long_w: number | null
  power_limit_short_w: number | null
  disable_turbo: boolean | null
  disable_bd_prochot: boolean | null
}

export interface ProfileConfig {
  profiles: Record<number, Profile>
  active_profile_id: number
  auto_apply_on_startup: boolean
  minimize_to_tray: boolean
  start_with_windows: boolean
}

// ========== API Calls ==========

export async function getCpuInfo(): Promise<CpuInfo> {
  return invoke('get_cpu_info')
}

export async function getSystemMetrics(): Promise<SystemSnapshot> {
  return invoke('get_system_metrics')
}

export async function getPowerPlans(): Promise<PowerPlan[]> {
  return invoke('get_power_plans')
}

export async function getActivePowerPlan(): Promise<PowerPlan> {
  return invoke('get_active_power_plan')
}

export async function setActivePowerPlan(guid: string): Promise<string> {
  return invoke('set_active_power_plan', { guid })
}

export async function createPowerPlan(name: string, baseSchemeGuid: string): Promise<PowerPlan> {
  return invoke('create_power_plan', { name, baseSchemeGuid })
}

export async function deletePowerPlan(guid: string): Promise<string> {
  return invoke('delete_power_plan', { guid })
}

export async function getPowerSchemeDetails(guid: string): Promise<PowerSchemeDetails> {
  return invoke('get_power_scheme_details', { schemeGuid: guid })
}

export async function getProcessorPowerSettings(guid: string): Promise<ProcessorPowerSettings> {
  return invoke('get_processor_power_settings', { schemeGuid: guid })
}

export async function setProcessorPowerSettings(
  schemeGuid: string,
  settings: ProcessorPowerSettings,
): Promise<string> {
  return invoke('set_processor_power_settings', { schemeGuid, settings })
}

// Profiles
export async function getProfiles(): Promise<ProfileConfig> {
  return invoke('get_profiles')
}

export async function updateProfile(profile: Profile): Promise<string> {
  return invoke('update_profile', { profile })
}

export async function applyProfile(profileId: number): Promise<string> {
  return invoke('apply_profile', { profileId })
}

export async function setProfile(id: number): Promise<string> {
  return invoke('set_active_profile', { id })
}

export async function resetProfiles(): Promise<string> {
  return invoke('reset_profiles')
}

// Autostart
export async function checkAutostart(): Promise<boolean> {
  return invoke('check_autostart')
}

export async function setAutostart(enabled: boolean): Promise<void> {
  return invoke('set_autostart_cmd', { enabled })
}
