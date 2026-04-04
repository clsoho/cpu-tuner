use serde::{Deserialize, Serialize};
use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum CpuVendor {
    Intel,
    AMD,
    Unknown,
}

impl CpuVendor {
    pub fn from_name(name: &str) -> Self {
        let n = name.to_lowercase();
        if n.contains("intel") {
            Self::Intel
        } else if n.contains("amd") {
            Self::AMD
        } else {
            Self::Unknown
        }
    }

    pub fn as_str(&self) -> &str {
        match self {
            Self::Intel => "Intel",
            Self::AMD => "AMD",
            Self::Unknown => "Unknown",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuInfo {
    pub name: String,
    pub vendor: String,
    pub family: u32,
    pub model: u32,
    pub stepping: u32,
    pub cores_physical: u32,
    pub cores_logical: u32,
    pub base_freq_mhz: u32,
    pub max_freq_mhz: u32,
    pub has_speed_shift: bool,
    pub has_turbo_boost: bool,
    pub architecture: String,
}

/// Execute WMIC and return trimmed stdout
fn run_wmic(args: &[&str]) -> Result<String, String> {
    let mut cmd = Command::new("wmic");
    cmd.args(args);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd
        .output()
        .map_err(|e| format!("wmic 执行失败: {}", e))?;
    if !output.status.success() {
        return Err(format!("wmic 返回错误码: {:?}", output.status));
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Parse a named value from WMIC /format:list output
fn wmic_get(output: &str, key: &str) -> Option<String> {
    output
        .lines()
        .find_map(|l| l.trim().strip_prefix(key).map(|v| v.trim().to_string()))
}

/// Detect CPU family/model/stepping via WMIC
fn parse_cpu_id(wmic_output: &str) -> (u32, u32, u32) {
    // WMIC Family values: 6 = Intel P6+/AMD K7+, 15 = NetBurst, 23 = Zen
    let family_str = wmic_get(wmic_output, "Family=").unwrap_or_default();
    let family = family_str.parse::<u32>().unwrap_or(0);

    // WMIC doesn't have a direct "Model" field; extract from Revision (hex like 0x906EA)
    // Revision encoding: [31:28] stepping, [27:20] model, [19:16] ext model, [15:12] family, etc.
    // But actually WMIC Revision format is vendor-specific. For Intel it's:
    //   Family:Model:Stepping in hex like 0x906EA -> Family=6, Model=0x9E=158, Stepping=0xA=10
    // Let's try to parse Revision as a hex number
    let revision_str = wmic_get(wmic_output, "Revision=").unwrap_or_default();
    let revision_str_clean = revision_str.trim_start_matches("0x");

    let (model, stepping) = if let Ok(rev) = u32::from_str_radix(revision_str_clean, 16) {
        // Standard CPUID layout: bits 4:0 = stepping, 7:4 = model, 11:8 = ext model
        let stepping = rev & 0xF;
        let model_low = (rev >> 4) & 0xF;
        let ext_model = (rev >> 16) & 0xF;
        let model = model_low | (ext_model << 4);
        (model, stepping)
    } else {
        (0, 0)
    };

    (family, model, stepping)
}

/// Detect CPU architecture name from family + model (Intel only for now)
fn intel_arch_name(family: u32, model: u32) -> String {
    if family != 6 {
        return "Unknown".to_string();
    }
    match model {
        42 | 45 => "Sandy Bridge".to_string(),
        58 | 62 => "Ivy Bridge".to_string(),
        60 | 69 | 70 => "Haswell".to_string(),
        61 => "Broadwell".to_string(),
        78 | 94 => "Skylake".to_string(),
        142 | 158 => "Kaby Lake".to_string(),
        126 | 140 => "Ice Lake".to_string(),
        141 | 165 => "Comet Lake".to_string(),
        151 | 154 => "Alder Lake".to_string(),
        183 | 186 => "Raptor Lake".to_string(),
        175 | 189 => "Arrow Lake".to_string(),
        _ => format!("Model {}", model),
    }
}

fn amd_arch_name(family: u32, model: u32) -> String {
    match (family, model) {
        (23, _) => "Zen / Zen+".to_string(),
        (25, m) if m <= 15 => "Zen 3".to_string(),
        (25, _) => "Zen 3 / Zen 4".to_string(),
        (26, _) => "Zen 5".to_string(),
        _ => format!("Family {} Model {}", family, model),
    }
}

pub fn detect_cpu() -> CpuInfo {
    let wmic_output = run_wmic(&[
        "cpu",
        "get",
        "Name,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed,Family,Revision",
        "/format:list",
    ])
    .unwrap_or_default();

    let name = wmic_get(&wmic_output, "Name=").unwrap_or_else(|| "Unknown CPU".to_string());
    let vendor_str = wmic_get(&wmic_output, "Name=").unwrap_or_default();
    let vendor = CpuVendor::from_name(&vendor_str);

    let cores_physical = wmic_get(&wmic_output, "NumberOfCores=")
        .and_then(|v| v.parse().ok())
        .unwrap_or(0);
    let cores_logical = wmic_get(&wmic_output, "NumberOfLogicalProcessors=")
        .and_then(|v| v.parse().ok())
        .unwrap_or(0);
    let base_freq = wmic_get(&wmic_output, "MaxClockSpeed=")
        .and_then(|v| v.parse().ok())
        .unwrap_or(0);

    let (family, model, stepping) = parse_cpu_id(&wmic_output);

    let has_speed_shift = match vendor {
        CpuVendor::Intel => family == 6 && model >= 94, // Skylake+
        _ => false,
    };

    let has_turbo_boost = name.to_lowercase().contains("turbo")
        || match vendor {
            CpuVendor::Intel => family == 6 && model >= 42, // Sandy Bridge+
            CpuVendor::AMD => family >= 23,                  // Zen+
            _ => false,
        };

    let architecture = match vendor {
        CpuVendor::Intel => intel_arch_name(family, model),
        CpuVendor::AMD => amd_arch_name(family, model),
        _ => "Unknown".to_string(),
    };

    CpuInfo {
        name,
        vendor: vendor.as_str().to_string(),
        family,
        model,
        stepping,
        cores_physical,
        cores_logical,
        base_freq_mhz: base_freq,
        max_freq_mhz: base_freq, // WMIC doesn't give turbo freq easily
        has_speed_shift,
        has_turbo_boost,
        architecture,
    }
}

/// Detect number of logical processors directly
pub fn detect_logical_cores() -> u32 {
    std::thread::available_parallelism()
        .map(|n| n.get() as u32)
        .unwrap_or(1)
}

#[tauri::command]
pub async fn get_cpu_info() -> Result<CpuInfo, String> {
    Ok(detect_cpu())
}
