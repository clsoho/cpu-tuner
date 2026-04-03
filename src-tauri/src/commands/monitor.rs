use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::command;
use log::{info, error};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuInfo {
    pub name: String,
    pub cores_physical: u32,
    pub cores_logical: u32,
    pub base_freq_mhz: Option<f64>,
    pub vendor: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuCoreMetric {
    pub core_id: u32,
    pub frequency_mhz: f64,
    pub usage_percent: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub timestamp: u64,
    pub cpu_usage_total: f32,
    pub cpu_freq_current_mhz: f64,
    pub cpu_freq_max_mhz: f64,
    pub cpu_freq_min_mhz: f64,
    pub cpu_temperature_c: Option<f32>,
    pub cpu_cores: Vec<CpuCoreMetric>,
    pub memory_total_mb: u64,
    pub memory_used_mb: u64,
    pub memory_usage_percent: f32,
}

/// 通过 wmic 获取 CPU 信息
fn get_cpu_info_from_wmic() -> Result<CpuInfo, String> {
    let mut cmd = Command::new("wmic");
    cmd.args(["cpu", "get", "Name,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed", "/format:list"]);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output().map_err(|e| format!("wmic 执行失败: {}", e))?;
    let stdout = String::from_utf8_lossy(&output.stdout);

    let mut name = String::new();
    let mut cores = 0u32;
    let mut logical = 0u32;
    let mut max_freq = 0u64;

    for line in stdout.lines() {
        let line = line.trim();
        if let Some(val) = line.strip_prefix("MaxClockSpeed=") {
            max_freq = val.trim().parse().unwrap_or(0);
        } else if let Some(val) = line.strip_prefix("Name=") {
            name = val.trim().to_string();
        } else if let Some(val) = line.strip_prefix("NumberOfCores=") {
            cores = val.trim().parse().unwrap_or(0);
        } else if let Some(val) = line.strip_prefix("NumberOfLogicalProcessors=") {
            logical = val.trim().parse().unwrap_or(0);
        }
    }

    Ok(CpuInfo {
        name,
        cores_physical: cores,
        cores_logical: logical,
        base_freq_mhz: if max_freq > 0 { Some(max_freq as f64) } else { None },
        vendor: detect_vendor(&name),
    })
}

fn detect_vendor(name: &str) -> String {
    let name_lower = name.to_lowercase();
    if name_lower.contains("intel") {
        "Intel".to_string()
    } else if name_lower.contains("amd") {
        "AMD".to_string()
    } else if name_lower.contains("apple") {
        "Apple".to_string()
    } else {
        "Unknown".to_string()
    }
}

/// 获取当前 CPU 频率 (通过 wmic)
fn get_current_cpu_freq() -> (f64, f64, f64) {
    // 当前频率
    let current = {
        let mut cmd = Command::new("wmic");
        cmd.args(["cpu", "get", "CurrentClockSpeed", "/format:list"]);
        #[cfg(windows)]
        cmd.creation_flags(CREATE_NO_WINDOW);

        cmd.output().ok().and_then(|o| {
            String::from_utf8_lossy(&o.stdout)
                .lines()
                .find_map(|l| l.trim().strip_prefix("CurrentClockSpeed=").and_then(|v| v.parse::<u64>().ok()))
                .map(|v| v as f64)
        }).unwrap_or(0.0)
    };

    // 最大频率
    let max = {
        let mut cmd = Command::new("wmic");
        cmd.args(["cpu", "get", "MaxClockSpeed", "/format:list"]);
        #[cfg(windows)]
        cmd.creation_flags(CREATE_NO_WINDOW);

        cmd.output().ok().and_then(|o| {
            String::from_utf8_lossy(&o.stdout)
                .lines()
                .find_map(|l| l.trim().strip_prefix("MaxClockSpeed=").and_then(|v| v.parse::<u64>().ok()))
                .map(|v| v as f64)
        }).unwrap_or(0.0)
    };

    (current, max, 0.0)
}

/// 使用 sysinfo 库获取系统指标
fn get_metrics_from_sysinfo() -> Result<SystemMetrics, String> {
    use sysinfo::{System, Cpu, Components};

    let mut sys = System::new_all();
    
    // 等一下让 cpu 使用率计算准确
    std::thread::sleep(std::time::Duration::from_millis(200));
    sys.refresh_cpu_usage();
    sys.refresh_memory();

    let cpus = sys.cpus();
    let cpu_usage_total = sys.global_cpu_usage();

    let cpu_cores: Vec<CpuCoreMetric> = cpus.iter().enumerate().map(|(i, cpu)| {
        CpuCoreMetric {
            core_id: i as u32,
            frequency_mhz: cpu.frequency() as f64,
            usage_percent: cpu.cpu_usage(),
        }
    }).collect();

    let memory_total = sys.total_memory();
    let memory_used = sys.used_memory();
    let memory_usage = if memory_total > 0 {
        (memory_used as f32 / memory_total as f32) * 100.0
    } else {
        0.0
    };

    let (freq_current, freq_max, freq_min) = get_current_cpu_freq();

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    Ok(SystemMetrics {
        timestamp,
        cpu_usage_total,
        cpu_freq_current_mhz: if freq_current > 0.0 { freq_current } else { cpus.first().map(|c| c.frequency() as f64).unwrap_or(0.0) },
        cpu_freq_max_mhz: freq_max,
        cpu_freq_min_mhz: freq_min,
        cpu_temperature_c: get_cpu_temperature(),
        cpu_cores,
        memory_total_mb: memory_total / 1024 / 1024,
        memory_used_mb: memory_used / 1024 / 1024,
        memory_usage_percent: memory_usage,
    })
}

/// 尝试获取 CPU 温度 (Windows 上比较难，用 MSAcpi_ThermalZoneData)
fn get_cpu_temperature() -> Option<f32> {
    let mut cmd = Command::new("wmic");
    cmd.args(["/namespace:\\\\root\\wmi", "PATH", "MSAcpi_ThermalZoneTemperature", "get", "CurrentTemperature", "/format:list"]);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output().ok()?;
    let stdout = String::from_utf8_lossy(&output.stdout);

    for line in stdout.lines() {
        if let Some(val) = line.trim().strip_prefix("CurrentTemperature=") {
            if let Ok(temp_k) = val.trim().parse::<f32>() {
                // wmic 返回的是开尔文 * 10
                let temp_c = (temp_k / 10.0) - 273.15;
                if temp_c > -50.0 && temp_c < 150.0 {
                    return Some((temp_c * 10.0).round() / 10.0);
                }
            }
        }
    }
    None
}

/// 获取 CPU 信息
#[command]
pub async fn get_cpu_info() -> Result<CpuInfo, String> {
    info!("[监控] 获取 CPU 信息");
    get_cpu_info_from_wmic()
}

/// 获取系统监控指标
#[command]
pub async fn get_system_metrics() -> Result<SystemMetrics, String> {
    get_metrics_from_sysinfo()
}
