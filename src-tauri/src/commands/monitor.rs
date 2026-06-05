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
    pub c0_percent: f32,
    pub frequency_mhz: f64,
    pub temperature_c: Option<f32>,
    pub multiplier: f64,
    pub vid: f64,
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
    pub package_power_w: Option<f32>,
    pub prochot_status: Option<bool>,
}

pub static MONITOR: std::sync::LazyLock<Mutex<MonitorState>> =
    std::sync::LazyLock::new(|| Mutex::new(MonitorState::new()));

pub struct MonitorState {
    sys: sysinfo::System,
    warmup: bool,
    prev_idle: Vec<u64>,
    prev_total: Vec<u64>,
}

impl MonitorState {
    pub fn new() -> Self {
        let mut sys = sysinfo::System::new_all();
        sys.refresh_cpu_usage();
        let ncpus = sys.cpus().len();
        Self {
            sys,
            warmup: false,
            prev_idle: vec![0; ncpus],
            prev_total: vec![0; ncpus],
        }
    }

    /// Read per-core C0% from /proc/stat equivalent on Windows.
    /// On Windows, we use sysinfo's cpu_usage() which already gives differential.
    /// For C0%, sysinfo's cpu_usage() gives the percentage of time the core was busy.
    fn read_c0_percent(&mut self) -> Vec<f32> {
        self.sys.refresh_cpu_usage();
        self.sys.cpus().iter().map(|c| c.cpu_usage()).collect()
    }

    pub fn snapshot(&mut self) -> SystemSnapshot {
        self.sys.refresh_cpu_usage();
        self.sys.refresh_memory();

        let threads = self.sys.cpus().len() as u32;
        let c0_readings = self.read_c0_percent();
        let cpus: Vec<_> = self.sys.cpus().iter().map(|c| (c.cpu_usage(), c.frequency())).collect();

        // Get current frequency from WMIC
        let freq_current = get_current_freq().unwrap_or(0.0);
        let base_freq = get_max_freq().unwrap_or(freq_current);

        // Temperature
        let temp = if !self.warmup { read_cpu_temp() } else { None };

        // Per-thread metrics
        let mut cores: Vec<CoreMetric> = Vec::new();
        for (i, (usage, freq)) in cpus.iter().enumerate() {
            let freq = *freq as f64;
            let usage = c0_readings.get(i).copied().unwrap_or(*usage);
            let mult = if base_freq > 0.0 { freq / base_freq } else { 0.0 };
            // VID estimation: on modern Intel, VID roughly = voltage identification
            // We use frequency / max_freq * max_vid (approximately 1.3V max)
            let ratio = if base_freq > 0.0 { freq / base_freq } else { 0.0 };
            let estimated_vid = 0.7 + (ratio * 0.6); // 0.7V idle to ~1.3V max

            cores.push(CoreMetric {
                thread_id: i as u32,
                c0_percent: usage,
                frequency_mhz: if freq > 100.0 { freq } else { freq_current },
                temperature_c: None,
                multiplier: mult,
                vid: estimated_vid,
            });
        }

        // Override frequencies with current WMIC freq if sysinfo gives 0
        for core in &mut cores {
            if core.frequency_mhz <= 100.0 && freq_current > 100.0 {
                core.frequency_mhz = freq_current;
                core.multiplier = if base_freq > 0.0 { freq_current / base_freq } else { 0.0 };
            }
        }

        let ram_total = self.sys.total_memory() / 1024 / 1024;
        let ram_used = self.sys.used_memory() / 1024 / 1024;
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

        // Attempt to read package power via WMI
        let package_power = read_package_power();

        SystemSnapshot {
            timestamp_ms: now_ms,
            cpu_usage_total: self.sys.global_cpu_usage(),
            cpu_threads: threads,
            cpu_freq_current_mhz: freq_current.max(
                self.sys.cpus().first().map(|c| c.frequency() as f64).unwrap_or(0.0)
            ),
            cpu_temp_c: temp,
            cores,
            ram_total_mb: ram_total,
            ram_used_mb: ram_used,
            ram_usage_percent: ram_pct,
            package_power_w: package_power,
            prochot_status: None,
        }
    }
}

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

fn read_cpu_temp() -> Option<f32> {
    let output = {
        let mut cmd = Command::new("wmic");
        cmd.args([
            "/namespace:\\\\root\\wmi", "path",
            "MSAcpi_ThermalZoneTemperature", "get",
            "CurrentTemperature", "/format:list",
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

/// Read CPU package power via WMI (MicrosoftRttm)
fn read_package_power() -> Option<f32> {
    let mut cmd = Command::new("wmic");
    cmd.args([
        "/namespace:\\\\root\\cimv2", "path",
        "Win32_PerfFormattedData_Counters_PowerMetrics", "get",
        "Power", "/format:list",
    ]);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    if let Ok(output) = cmd.output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            if let Some(val) = line.trim().strip_prefix("Power=") {
                if let Ok(w) = val.trim().parse::<f32>() {
                    if w > 0.0 && w < 1000.0 {
                        return Some(w / 1000.0);
                    }
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
