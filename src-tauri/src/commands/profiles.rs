use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub id: u32,
    pub name: String,
    pub icon: String,

    // Power plan settings
    pub power_plan_guid: Option<String>,
    pub min_processor_state: Option<u32>,
    pub max_processor_state: Option<u32>,
    pub system_cooling_policy: Option<u32>,
    pub processor_boost_mode: Option<u32>,

    // Speed Shift EPP (0=performance, 255=powersave)
    pub speed_shift_epp: Option<u32>,

    // Future: MSR-based features (placeholders for phase 2)
    pub undervolt_core_mv: Option<i32>,
    pub undervolt_cache_mv: Option<i32>,
    pub undervolt_gpu_mv: Option<i32>,
    pub power_limit_long_w: Option<u32>,
    pub power_limit_short_w: Option<u32>,

    // Misc
    pub disable_turbo: Option<bool>,
    pub disable_bd_prochot: Option<bool>,
}

impl Profile {
    pub fn preset_battery() -> Self {
        Self {
            id: 1,
            name: "省电模式".into(),
            icon: "🔋".into(),
            power_plan_guid: Some("a1841308-3541-4fab-bc81-f71556f20b4a".into()), // Power Saver
            min_processor_state: Some(5),
            max_processor_state: Some(50),
            system_cooling_policy: Some(0), // passive
            processor_boost_mode: Some(0),  // disabled
            speed_shift_epp: Some(212),
            undervolt_core_mv: None,
            undervolt_cache_mv: None,
            undervolt_gpu_mv: None,
            power_limit_long_w: None,
            power_limit_short_w: None,
            disable_turbo: Some(true),
            disable_bd_prochot: None,
        }
    }

    pub fn preset_balanced() -> Self {
        Self {
            id: 2,
            name: "均衡模式".into(),
            icon: "⚡".into(),
            power_plan_guid: Some("381b4222-f694-41f0-9685-ff5bb260df2e".into()), // Balanced
            min_processor_state: Some(5),
            max_processor_state: Some(100),
            system_cooling_policy: Some(1), // active
            processor_boost_mode: Some(2),  // efficient
            speed_shift_epp: Some(128),
            undervolt_core_mv: None,
            undervolt_cache_mv: None,
            undervolt_gpu_mv: None,
            power_limit_long_w: None,
            power_limit_short_w: None,
            disable_turbo: None,
            disable_bd_prochot: None,
        }
    }

    pub fn preset_performance() -> Self {
        Self {
            id: 3,
            name: "高性能".into(),
            icon: "🎮".into(),
            power_plan_guid: Some("8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c".into()), // High Performance
            min_processor_state: Some(100),
            max_processor_state: Some(100),
            system_cooling_policy: Some(1), // active
            processor_boost_mode: Some(3),  // aggressive
            speed_shift_epp: Some(32),
            undervolt_core_mv: None,
            undervolt_cache_mv: None,
            undervolt_gpu_mv: None,
            power_limit_long_w: None,
            power_limit_short_w: None,
            disable_turbo: Some(false),
            disable_bd_prochot: None,
        }
    }

    pub fn preset_extreme() -> Self {
        Self {
            id: 4,
            name: "极致性能".into(),
            icon: "🖥️".into(),
            power_plan_guid: Some("8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c".into()), // High Performance
            min_processor_state: Some(100),
            max_processor_state: Some(100),
            system_cooling_policy: Some(1), // active
            processor_boost_mode: Some(3),  // aggressive
            speed_shift_epp: Some(0),       // max performance
            undervolt_core_mv: None,
            undervolt_cache_mv: None,
            undervolt_gpu_mv: None,
            power_limit_long_w: None,
            power_limit_short_w: None,
            disable_turbo: Some(false),
            disable_bd_prochot: Some(false),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileConfig {
    pub profiles: HashMap<u32, Profile>,
    pub active_profile_id: u32,
    pub auto_apply_on_startup: bool,
    pub minimize_to_tray: bool,
    pub start_with_windows: bool,
}

impl ProfileConfig {
    fn config_dir() -> PathBuf {
        dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("cpu-tuner")
    }

    fn config_path() -> PathBuf {
        Self::config_dir().join("profiles.json")
    }

    pub fn default_config() -> Self {
        let mut profiles = HashMap::new();
        profiles.insert(1, Profile::preset_battery());
        profiles.insert(2, Profile::preset_balanced());
        profiles.insert(3, Profile::preset_performance());
        profiles.insert(4, Profile::preset_extreme());
        Self {
            profiles,
            active_profile_id: 2,
            auto_apply_on_startup: true,
            minimize_to_tray: true,
            start_with_windows: false,
        }
    }

    pub fn load() -> Result<Self, String> {
        let path = Self::config_path();
        if path.exists() {
            let content = std::fs::read_to_string(&path)
                .map_err(|e| format!("读取配置文件失败: {}", e))?;
            serde_json::from_str(&content)
                .map_err(|e| format!("解析配置文件失败: {}", e))
        } else {
            let config = Self::default_config();
            config.save()?;
            Ok(config)
        }
    }

    pub fn save(&self) -> Result<(), String> {
        let dir = Self::config_dir();
        std::fs::create_dir_all(&dir)
            .map_err(|e| format!("创建配置目录失败: {}", e))?;
        let content = serde_json::to_string_pretty(self)
            .map_err(|e| format!("序列化配置失败: {}", e))?;
        std::fs::write(Self::config_path(), content)
            .map_err(|e| format!("写入配置文件失败: {}", e))?;
        Ok(())
    }
}

/// Apply a profile's power settings via powercfg
fn apply_profile_settings(profile: &Profile) -> Result<(), String> {
    let subgroup = "54533251-82be-4824-96c1-47b60b740d00";

    // If profile has a target power plan GUID, switch to it first
    if let Some(ref guid) = profile.power_plan_guid {
        let _ = super::power_plan::run_powercfg(&["/setactive", guid]);
    }

    // Get current active scheme to apply per-settings
    let active_guid = super::power_plan::get_active_scheme_guid()?;

    // Helper: set both AC and DC values
    let set_acdc = |setting_guid: &str, ac_val: u32, dc_val: u32| {
        super::power_plan::run_powercfg(&[
            "/setacvalueindex",
            &active_guid,
            subgroup,
            setting_guid,
            &ac_val.to_string(),
        ])?;
        super::power_plan::run_powercfg(&[
            "/setdcvalueindex",
            &active_guid,
            subgroup,
            setting_guid,
            &dc_val.to_string(),
        ])?;
        Ok::<(), String>(())
    };

    if let Some(val) = profile.min_processor_state {
        set_acdc("893dee8e-2bef-41e0-89c6-b55d0929964c", val, val)?;
    }

    if let Some(val) = profile.max_processor_state {
        set_acdc("bc5038f7-23e0-4960-96da-33abaf5935ec", val, val)?;
    }

    if let Some(val) = profile.system_cooling_policy {
        set_acdc("94d3a615-a899-4ac5-ae2b-e4d8f634367f", val, val)?;
    }

    if let Some(val) = profile.processor_boost_mode {
        set_acdc("be337238-0d82-4146-a960-4f3749d470c7", val, val)?;
    }

    // Reactivate to apply changes
    super::power_plan::run_powercfg(&["/setactive", &active_guid])?;

    Ok(())
}

/// Get all profiles
#[tauri::command]
pub async fn get_profiles() -> Result<ProfileConfig, String> {
    ProfileConfig::load()
}

/// Update a specific profile
#[tauri::command]
pub async fn update_profile(profile: Profile) -> Result<String, String> {
    let mut config = ProfileConfig::load()?;
    config.profiles.insert(profile.id, profile.clone());
    config.save()?;
    Ok(format!("配置 [{}] 已保存", profile.name))
}

/// Apply a profile (switch settings + set as active)
#[tauri::command]
pub async fn apply_profile(profile_id: u32) -> Result<String, String> {
    let config = ProfileConfig::load()?;
    let profile = config
        .profiles
        .get(&profile_id)
        .ok_or_else(|| format!("未找到配置 ID: {}", profile_id))?
        .clone();

    apply_profile_settings(&profile)?;

    // Save active profile
    let mut updated = ProfileConfig::load()?;
    updated.active_profile_id = profile_id;
    updated.save()?;

    Ok(format!("已应用: {} {}", profile.icon, profile.name))
}

/// Just switch which profile is shown as active (without applying)
#[tauri::command]
pub async fn set_active_profile(profile_id: u32) -> Result<String, String> {
    let mut config = ProfileConfig::load()?;
    if !config.profiles.contains_key(&profile_id) {
        return Err(format!("配置 ID {} 不存在", profile_id));
    }
    config.active_profile_id = profile_id;
    config.save()?;
    Ok(format!("已切换到配置 {}", profile_id))
}

/// Reset to 4 default presets
#[tauri::command]
pub async fn reset_profiles() -> Result<String, String> {
    let config = ProfileConfig::default_config();
    config.save()?;
    Ok("已恢复默认配置".to_string())
}
