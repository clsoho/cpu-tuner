use serde::{Deserialize, Serialize};
use std::process::Command;
use std::sync::Mutex;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoreMetric {
    pub thread_id: u32,
    pub usage_percent: f32,
    pub frequency_mhz: f64,
    pub temperature_c: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemSnapshot {
    pub timestamp_ms: u64,
    pub cpu_usage_total: f32,
    pub cpu_threads: u32,
    pub cpu_freq_current_mhz: f64,
    pub cpu_temp_c: Option<f32>,
    pub cores: Vec<CoreMetric>,
    pub ram_total_mb: u64,
    pub ram_used_mb: u64,
    pub ram_usage_percent: f32,
}

/// Global singleton monitor — needs warmup because CPU usage is differential
pub static MONITOR: std::sync::LazyLock<Mutex<MonitorState>> =
    std::sync::LazyLock::new(|| Mutex::new(MonitorState::new()));

pub struct MonitorState {
    sys: sysinfo::System,
    warmup: bool,
}

impl MonitorState {
    pub fn new() -> Self {
        let mut sys = sysinfo::System::new_all();
        sys.refresh_cpu_usage();
        Self { sys, warmup: false }
    }

    pub fn snapshot(&mut self) -> SystemSnapshot {
        let sys = &mut self.sys;
        sys.refresh_cpu_usage();
        sys.refresh_memory();

        let threads = sys.cpus().len() as u32;

        // Per-thread metrics
        let mut cores: Vec<CoreMetric> = Vec::new();
        for (i, cpu) in sys.cpus().iter().enumerate() {
            let freq = cpu.frequency() as f64;
            let usage = cpu.cpu_usage();
            cores.push(CoreMetric {
                thread_id: i as u32,
                usage_percent: usage,
                frequency_mhz: freq,
                temperature_c: None, // per-core temp needs MSR; package temp below
            });
        }

        // Current freq from WMIC
        let freq_current = get_current_freq().unwrap_or(
            sys.cpus().first().map(|c| c.frequency() as f64).unwrap_or(0.0),
        );
        let freq_max = get_max_freq().unwrap_or(
            sys.cpus()
                .first()
                .map(|c| c.frequency() as f64)
                .unwrap_or(0.0),
        );

        // Temperature
        let temp = if !self.warmup {
            read_cpu_temp()
        } else {
            None
        };

        let ram_total = sys.total_memory() / 1024 / 1024;
        let ram_used = sys.used_memory() / 1024 / 1024;
        let ram_pct = if ram_total > 0 {
            (ram_used as f32 / ram_total as f32) * 100.0
        } else {
            0.0
        };

        self.warmup = true;

        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        // Override frequency on each core with current freq if we lack per-thread data from sysinfo
        for core in &mut cores {
            if core.frequency_mhz <= 100.0 && freq_current > 100.0 {
                core.frequency_mhz = freq_current;
            }
        }

        SystemSnapshot {
            timestamp_ms: now_ms,
            cpu_usage_total: sys.global_cpu_usage(),
            cpu_threads: threads,
            cpu_freq_current_mhz: freq_current.max(sys.cpus().first().map(|c| c.frequency() as f64).unwrap_or(0.0)),
            cpu_temp_c: temp,
            cores,
            ram_total_mb: ram_total,
            ram_used_mb: ram_used,
            ram_usage_percent: ram_pct,
        }
    }
}

/// Get current CPU frequency via WMIC
fn get_current_freq() -> Option<f64> {
    let mut cmd = Command::new("wmic");
    cmd.args(["cpu", "get", "CurrentClockSpeed", "/format:list"]);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    let output = cmd.output().ok()?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    stdout
        .lines()
        .find_map(|l| l.trim().strip_prefix("CurrentClockSpeed="))
        .and_then(|v| v.trim().parse::<f64>().ok())
}

/// Get max CPU frequency via WMIC
fn get_max_freq() -> Option<f64> {
    let mut cmd = Command::new("wmic");
    cmd.args(["cpu", "get", "MaxClockSpeed", "/format:list"]);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    let output = cmd.output().ok()?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    stdout
        .lines()
        .find_map(|l| l.trim().strip_prefix("MaxClockSpeed="))
        .and_then(|v| v.trim().parse::<f64>().ok())
}

/// Read CPU package temperature via WMI MSAcpi_ThermalZoneTemperature
fn read_cpu_temp() -> Option<f32> {
    let output = {
        let mut cmd = Command::new("wmic");
        cmd.args([
            "/namespace:\\\\root\\wmi",
            "path",
            "MSAcpi_ThermalZoneTemperature",
            "get",
            "CurrentTemperature",
            "/format:list",
        ]);
        #[cfg(windows)]
        cmd.creation_flags(CREATE_NO_WINDOW);
        cmd.output().ok()?
    };
    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        if let Some(val) = line.trim().strip_prefix("CurrentTemperature=") {
            if let Ok(kx10) = val.trim().parse::<f32>() {
                let c = (kx10 / 10.0) - 273.15;
                if (-30.0..=150.0).contains(&c) {
                    return Some((c * 10.0).round() / 10.0);
                }
            }
        }
    }
    None
}

#[tauri::command]
pub async fn get_system_metrics() -> Result<SystemSnapshot, String> {
    let mut m = MONITOR.lock().map_err(|e| e.to_string())?;
    Ok(m.snapshot())
}
