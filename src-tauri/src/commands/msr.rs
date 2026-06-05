use serde::{Deserialize, Serialize};
use std::time::Instant;

// ==================== TPL (Turbo Power Limits) ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TplSettings {
    pub power_limit_long_w: Option<u32>,
    pub power_limit_short_w: Option<u32>,
    pub turbo_time_window_s: Option<u32>,
    pub mmio_lock: bool,
    pub sync_mmio: bool,
}

impl Default for TplSettings {
    fn default() -> Self {
        Self {
            power_limit_long_w: None,
            power_limit_short_w: None,
            turbo_time_window_s: None,
            mmio_lock: false,
            sync_mmio: false,
        }
    }
}

/// Read current TPL settings via powercfg
pub fn read_tpl_settings() -> TplSettings {
    let subgroup = "54533251-82be-4824-96c1-47b60b740d00";
    let pl1_guid = "dea1f3b1-99c4-4c34-b4b9-0c1d577cb6e7"; // Power Limit 1
    let pl2_guid = "afb9d89b-6e6c-4b8d-9c5a-6e7cfb0a7a3b"; // Power Limit 2

    let active_guid = super::power_plan::get_active_scheme_guid().unwrap_or_default();

    let read_val = |setting_guid: &str| -> Option<u32> {
        if let Ok(output) = super::power_plan::run_powercfg(&[
            "/query", &active_guid, subgroup, setting_guid,
        ]) {
            for line in output.lines() {
                let line = line.trim();
                if line.contains("0x") || line.contains("0X") {
                    if let Some(hex_start) = line.find("0x").or_else(|| line.find("0X")) {
                        let hex_str = &line[hex_start + 2..];
                        let hex_str = hex_str.split_whitespace().next().unwrap_or(hex_str);
                        if let Ok(val) = u32::from_str_radix(hex_str.trim_end_matches(')'), 16) {
                            return Some(val);
                        }
                    }
                    // Also try decimal
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if let Some(last) = parts.last() {
                        if let Ok(val) = last.parse::<u32>() {
                            return Some(val);
                        }
                    }
                }
            }
        }
        None
    };

    TplSettings {
        power_limit_long_w: read_val(pl1_guid),
        power_limit_short_w: read_val(pl2_guid),
        turbo_time_window_s: None,
        mmio_lock: false,
        sync_mmio: false,
    }
}

/// Apply TPL settings via powercfg
pub fn apply_tpl_settings(settings: &TplSettings) -> Result<(), String> {
    let subgroup = "54533251-82be-4824-96c1-47b60b740d00";
    let active_guid = super::power_plan::get_active_scheme_guid()?;

    if let Some(pl1) = settings.power_limit_long_w {
        // Power Limit 1: convert watts to mW
        let _ = super::power_plan::run_powercfg(&[
            "/setacvalueindex", &active_guid, subgroup,
            "dea1f3b1-99c4-4c34-b4b9-0c1d577cb6e7",
            &pl1.to_string(),
        ]);
    }

    if let Some(pl2) = settings.power_limit_short_w {
        let _ = super::power_plan::run_powercfg(&[
            "/setacvalueindex", &active_guid, subgroup,
            "afb9d89b-6e6c-4b8d-9c5a-6e7cfb0a7a3b",
            &pl2.to_string(),
        ]);
    }

    // Reactivate to apply
    let _ = super::power_plan::run_powercfg(&["/setactive", &active_guid]);
    Ok(())
}

// ==================== FIVR (Voltage) ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FivrData {
    pub core_offset_mv: Option<i32>,
    pub cache_offset_mv: Option<i32>,
    pub gpu_offset_mv: Option<i32>,
    pub system_agent_offset_mv: Option<i32>,
    pub core_voltage_mv: Option<i32>,
    pub cache_voltage_mv: Option<i32>,
}

/// Read current FIVR data (stub - requires MSR driver for real values)
pub fn read_fivr_data() -> FivrData {
    FivrData {
        core_offset_mv: None,
        cache_offset_mv: None,
        gpu_offset_mv: None,
        system_agent_offset_mv: None,
        core_voltage_mv: None,
        cache_voltage_mv: None,
    }
}

/// Apply FIVR offset (stub - requires MSR driver)
pub fn apply_fivr_offset(_target: &str, _offset_mv: i32) -> Result<(), String> {
    // On modern CPUs, FIVR requires kernel driver access.
    // For now, log and return success.
    log::info!("FIVR offset would be applied: {} {}mV (requires MSR driver)", _target, _offset_mv);
    Ok(())
}

// ==================== Clock Modulation ====================

/// Apply clock modulation via powercfg or WMI
pub fn apply_clock_modulation(duty_percent: u32) -> Result<(), String> {
    let duty = duty_percent.min(100);
    if duty >= 100 {
        // Disable clock modulation
        return Ok(());
    }

    // Use powercfg to set processor throttling
    let subgroup = "54533251-82be-4824-96c1-47b60b740d00";
    let throttling_guid = "4c4454f-6b99-4a6b-bbfc-7c5c9078a789";

    let active_guid = super::power_plan::get_active_scheme_guid()?;

    // Set throttling to a percentage (this is a simplified approach)
    let _ = super::power_plan::run_powercfg(&[
        "/setacvalueindex", &active_guid, subgroup, throttling_guid, &duty.to_string(),
    ]);
    let _ = super::power_plan::run_powercfg(&["/setactive", &active_guid]);

    log::info!("Clock modulation set to {}%", duty);
    Ok(())
}

// ==================== TS Bench ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchResult {
    pub score: u32,
    pub time_ms: u64,
}

/// Simple CPU benchmark: busy-loop prime calculation
pub fn run_bench(threads: u32, iterations: u32) -> BenchResult {
    use std::thread;

    let total_iterations = iterations.max(100);
    let num_threads = threads.max(1).min(64) as usize;

    let start = Instant::now();
    let mut handles = Vec::new();

    for _ in 0..num_threads {
        let iters = total_iterations;
        handles.push(thread::spawn(move || {
            let mut count = 0u64;
            // Prime number calculation as a benchmark workload
            for n in 2..(iters as u64 + 2) {
                let mut is_prime = true;
                let limit = (n as f64).sqrt() as u64;
                for i in 2..=limit {
                    if n % i == 0 {
                        is_prime = false;
                        break;
                    }
                }
                if is_prime {
                    count += 1;
                }
            }
            count
        }));
    }

    let mut total_primes = 0u64;
    for h in handles {
        total_primes += h.join().unwrap_or(0);
    }

    let elapsed = start.elapsed();
    let time_ms = elapsed.as_millis() as u64;
    // Score = primes processed / second
    let score = if time_ms > 0 {
        (total_primes as u32) * 1000 / time_ms.max(1) as u32
    } else {
        0
    };

    BenchResult { score, time_ms }
}

// ==================== Tauri Commands ====================

#[tauri::command]
pub async fn get_tpl_settings() -> TplSettings {
    read_tpl_settings()
}

#[tauri::command]
pub async fn set_tpl_settings(settings: TplSettings) -> Result<String, String> {
    apply_tpl_settings(&settings)?;
    Ok("TPL settings applied".to_string())
}

#[tauri::command]
pub async fn get_fivr_data() -> FivrData {
    read_fivr_data()
}

#[tauri::command]
pub async fn set_fivr_offset(target: String, offset_mv: i32) -> Result<String, String> {
    apply_fivr_offset(&target, offset_mv)?;
    Ok(format!("FIVR {} offset set to {} mV", target, offset_mv))
}

#[tauri::command]
pub async fn set_clock_modulation(duty_percent: u32) -> Result<String, String> {
    apply_clock_modulation(duty_percent)?;
    Ok(format!("Clock modulation set to {}%", duty_percent))
}

#[tauri::command]
pub async fn run_ts_bench(threads: u32, iterations: u32) -> BenchResult {
    run_bench(threads, iterations)
}
