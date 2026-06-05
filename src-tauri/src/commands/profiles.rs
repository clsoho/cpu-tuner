use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub id: u32,
    pub name: String,
    pub icon: String,
    pub power_plan_guid: Option<String>,
    pub min_processor_state: Option<u32>,
    pub max_processor_state: Option<u32>,
    pub system_cooling_policy: Option<u32>,
    pub processor_boost_mode: Option<u32>,
    pub speed_shift_epp: Option<u32>,
    pub undervolt_core_mv: Option<i32>,
    pub undervolt_cache_mv: Option<i32>,
    pub undervolt_gpu_mv: Option<i32>,
    pub power_limit_long_w: Option<u32>,
    pub power_limit_short_w: Option<u32>,
    pub turbo_time_window_s: Option<u32>,
    pub disable_turbo: Option<bool>,
    pub disable_bd_prochot: Option<bool>,
    pub speed_step: Option<bool>,
    pub speed_shift: Option<bool>,
    pub c1e: Option<bool>,
    pub clock_modulation_duty: Option<u32>,
    pub set_multiplier: Option<u32>,
}

impl Profile {
    pub fn preset_battery() -> Self {
        Self {
            id: 1, name: "省电模式".to_string(), icon: "\u{1F50B}".to_string(),
            power_plan_guid: Some("a1841308-3541-4fab-bc81-f71556f20b4a".to_string()),
            min_processor_state: Some(5), max_processor_state: Some(50),
            system_cooling_policy: Some(0), processor_boost_mode: Some(0),
            speed_shift_epp: Some(212),
            undervolt_core_mv: None, undervolt_cache_mv: None, undervolt_gpu_mv: None,
            power_limit_long_w: Some(35), power_limit_short_w: Some(45),
            turbo_time_window_s: Some(28),
            disable_turbo: Some(true), disable_bd_prochot: None,
            speed_step: None, speed_shift: None, c1e: None,
            clock_modulation_duty: None, set_multiplier: None,
        }
    }

    pub fn preset_balanced() -> Self {
        Self {
            id: 2, name: "均衡模式".to_string(), icon: "\u{26A1}".to_string(),
            power_plan_guid: Some("381b4222-f694-41f0-9685-ff5bb260df2e".to_string()),
            min_processor_state: Some(5), max_processor_state: Some(100),
            system_cooling_policy: Some(1), processor_boost_mode: Some(2),
            speed_shift_epp: Some(128),
            undervolt_core_mv: None, undervolt_cache_mv: None, undervolt_gpu_mv: None,
            power_limit_long_w: Some(65), power_limit_short_w: Some(85),
            turbo_time_window_s: Some(56),
            disable_turbo: None, disable_bd_prochot: None,
            speed_step: None, speed_shift: None, c1e: None,
            clock_modulation_duty: None, set_multiplier: None,
        }
    }

    pub fn preset_performance() -> Self {
        Self {
            id: 3, name: "高性能".to_string(), icon: "\u{1F3AE}".to_string(),
            power_plan_guid: Some("8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c".to_string()),
            min_processor_state: Some(100), max_processor_state: Some(100),
            system_cooling_policy: Some(1), processor_boost_mode: Some(3),
            speed_shift_epp: Some(32),
            undervolt_core_mv: None, undervolt_cache_mv: None, undervolt_gpu_mv: None,
            power_limit_long_w: Some(95), power_limit_short_w: Some(125),
            turbo_time_window_s: Some(56),
            disable_turbo: Some(false), disable_bd_prochot: None,
            speed_step: None, speed_shift: None, c1e: None,
            clock_modulation_duty: None, set_multiplier: None,
        }
    }

    pub fn preset_extreme() -> Self {
        Self {
            id: 4, name: "极致性能".to_string(), icon: "\u{1F5A5}\u{FE0F}".to_string(),
            power_plan_guid: Some("8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c".to_string()),
            min_processor_state: Some(100), max_processor_state: Some(100),
            system_cooling_policy: Some(1), processor_boost_mode: Some(3),
            speed_shift_epp: Some(0),
            undervolt_core_mv: None, undervolt_cache_mv: None, undervolt_gpu_mv: None,
            power_limit_long_w: None, power_limit_short_w: None,
            turbo_time_window_s: None,
            disable_turbo: Some(false), disable_bd_prochot: Some(false),
            speed_step: None, speed_shift: None, c1e: None,
            clock_modulation_duty: None, set_multiplier: None,
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
    pub alarm_temp_threshold: Option<u32>,
    pub battery_profile_id: Option<u32>,
    pub ac_profile_id: Option<u32>,
}

impl Default for ProfileConfig {
    fn default() -> Self { Self::default_config() }
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
            alarm_temp_threshold: Some(95),
            battery_profile_id: Some(1),
            ac_profile_id: Some(3),
        }
    }

    pub fn load() -> Result<Self, String> {
        let path = Self::config_path();
        if path.exists() {
            if let Ok(content) = std::fs::read_to_string(&path) {
                match serde_json::from_str::<Self>(&content) {
                    Ok(config) => {
                        if config.profiles.len() >= 4 { return Ok(config); }
                        log::warn!("Config incomplete ({} profiles), regenerating", config.profiles.len());
                    }
                    Err(e) => log::warn!("Config parse error: {}, regenerating", e),
                }
            }
        }
        let config = Self::default_config();
        config.save()?;
        Ok(config)
    }

    pub fn save(&self) -> Result<(), String> {
        let dir = Self::config_dir();
        std::fs::create_dir_all(&dir)
            .map_err(|e| format!("Failed to create config dir: {}", e))?;
        if self.profiles.is_empty() {
            return Err("Cannot save empty profile config".to_string());
        }
        let content = serde_json::to_string_pretty(self)
            .map_err(|e| format!("Failed to serialize: {}", e))?;
        std::fs::write(Self::config_path(), content)
            .map_err(|e| format!("Failed to write config: {}", e))?;
        Ok(())
    }
}

fn apply_profile_settings(profile: &Profile) -> Result<(), String> {
    let subgroup = "54533251-82be-4824-96c1-47b60b740d00";

    if let Some(ref guid) = profile.power_plan_guid {
        let _ = super::power_plan::run_powercfg(&["/setactive", guid]);
    }

    let active_guid = super::power_plan::get_active_scheme_guid()?;

    let set_acdc = |setting_guid: &str, ac_val: u32, dc_val: u32| -> Result<(), String> {
        super::power_plan::run_powercfg(&[
            "/setacvalueindex", &active_guid, subgroup, setting_guid, &ac_val.to_string(),
        ])?;
        super::power_plan::run_powercfg(&[
            "/setdcvalueindex", &active_guid, subgroup, setting_guid, &dc_val.to_string(),
        ])?;
        Ok(())
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

    super::power_plan::run_powercfg(&["/setactive", &active_guid])?;
    Ok(())
}

#[tauri::command]
pub async fn get_profiles() -> Result<ProfileConfig, String> {
    ProfileConfig::load()
}

#[tauri::command]
pub async fn update_profile(profile: Profile) -> Result<String, String> {
    let mut config = ProfileConfig::load()?;
    config.profiles.insert(profile.id, profile.clone());
    config.save()?;
    Ok(format!("Config [{}] saved", profile.name))
}

#[tauri::command]
pub async fn apply_profile(profile_id: u32) -> Result<String, String> {
    let config = ProfileConfig::load()?;
    let profile = config
        .profiles
        .get(&profile_id)
        .ok_or_else(|| format!("Profile ID {} not found", profile_id))?
        .clone();

    apply_profile_settings(&profile)?;

    let mut updated = ProfileConfig::load()?;
    updated.active_profile_id = profile_id;
    updated.save()?;

    Ok(format!("Applied: {} {}", profile.icon, profile.name))
}

#[tauri::command]
pub async fn set_active_profile(profile_id: u32) -> Result<String, String> {
    let mut config = ProfileConfig::load()?;
    if !config.profiles.contains_key(&profile_id) {
        return Err(format!("Profile ID {} does not exist", profile_id));
    }
    config.active_profile_id = profile_id;
    config.save()?;
    Ok(format!("Switched to profile {}", profile_id))
}

#[tauri::command]
pub async fn reset_profiles() -> Result<String, String> {
    let config = ProfileConfig::default_config();
    config.save()?;
    Ok("Reset to default configs".to_string())
}
