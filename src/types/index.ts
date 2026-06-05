import { invoke } from '@tauri-apps/api/core'

// ==================== CPU Info ====================

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

// ==================== Monitoring ====================

export interface CoreMetric {
  thread_id: number
  c0_percent: number
  frequency_mhz: number
  temperature_c: number | null
  multiplier: number
  vid: number
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
  package_power_w: number | null
  prochot_status: boolean | null
}

// ==================== Power Plans ====================

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

// ==================== Turbo Power Limits (TPL) ====================

export interface TplSettings {
  power_limit_long_w: number | null
  power_limit_short_w: number | null
  turbo_time_window_s: number | null
  mmio_lock: boolean
  sync_mmio: boolean
}

// ==================== FIVR (Voltage) ====================

export interface FivrData {
  core_offset_mv: number | null
  cache_offset_mv: number | null
  gpu_offset_mv: number | null
  system_agent_offset_mv: number | null
  core_voltage_mv: number | null
  cache_voltage_mv: number | null
}

// ==================== Profiles ====================

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
  turbo_time_window_s: number | null
  disable_turbo: boolean | null
  disable_bd_prochot: boolean | null
  speed_step: boolean | null
  speed_shift: boolean | null
  c1e: boolean | null
  clock_modulation_duty: number | null
  set_multiplier: number | null
}

export interface ProfileConfig {
  profiles: Record<number, Profile>
  active_profile_id: number
  auto_apply_on_startup: boolean
  minimize_to_tray: boolean
  start_with_windows: boolean
  alarm_temp_threshold: number | null
  battery_profile_id: number | null
  ac_profile_id: number | null
}

// ==================== API Calls ====================

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

// TPL
export async function getTplSettings(): Promise<TplSettings> {
  return invoke('get_tpl_settings')
}

export async function setTplSettings(settings: TplSettings): Promise<string> {
  return invoke('set_tpl_settings', { settings })
}

// FIVR
export async function getFivrData(): Promise<FivrData> {
  return invoke('get_fivr_data')
}

export async function setFivrOffset(target: string, offsetMv: number): Promise<string> {
  return invoke('set_fivr_offset', { target, offsetMv })
}

// Clock Modulation
export async function setClockModulation(dutyPercent: number): Promise<string> {
  return invoke('set_clock_modulation', { dutyPercent })
}

export async function getFreqLimit(): Promise<number[]> {
  return invoke('get_freq_limit')
}

// Autostart
export async function checkAutostart(): Promise<boolean> {
  return invoke('check_autostart')
}

export async function setAutostart(enabled: boolean): Promise<void> {
  return invoke('set_autostart_cmd', { enabled })
}

// TS Bench
export async function runTsBench(threads: number, iterations: number): Promise<{score: number; timeMs: number}> {
  return invoke('run_ts_bench', { threads, iterations })
}
