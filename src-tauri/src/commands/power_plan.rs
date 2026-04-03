use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::command;
use log::{info, error};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PowerPlan {
    pub guid: String,
    pub name: String,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessorPowerSettings {
    /// 最小处理器状态 (0-100)
    pub min_processor_state: Option<u32>,
    /// 最大处理器状态 (0-100)
    pub max_processor_state: Option<u32>,
    /// 系统散热策略 (0=被动, 1=主动)
    pub system_cooling_policy: Option<u32>,
    /// 处理器性能提升模式 (0=禁用, 1=启用, 2=主动, 4=高效启用)
    pub processor_boost_mode: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PowerSchemeDetails {
    pub scheme_guid: String,
    pub processor: ProcessorPowerSettings,
}

/// 执行 powercfg 命令并返回输出
fn run_powercfg(args: &[&str]) -> Result<String, String> {
    let mut cmd = Command::new("powercfg");
    cmd.args(args);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output().map_err(|e| format!("执行 powercfg 失败: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        error!("powercfg 命令失败: {}", stderr);
        return Err(format!("powercfg 命令失败: {}", stderr));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// 解析 powercfg /list 输出
fn parse_power_plans(output: &str) -> Vec<PowerPlan> {
    let mut plans = Vec::new();
    let mut is_star_section = false;

    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with("现有的电源方案") || line.starts_with("Existing") {
            continue;
        }

        // 检查是否包含 * (活动计划标记)
        let is_active = line.contains('*');
        let clean_line = line.replace('*', "").trim().to_string();

        // GUID 格式: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
        if let Some(guid_start) = clean_line.find('{') {
            if let Some(guid_end) = clean_line.find('}') {
                let guid = clean_line[guid_start + 1..guid_end].to_string();
                let name = clean_line[guid_end + 1..].trim().trim_start_matches('(').trim_end_matches(')').trim().to_string();

                if !guid.is_empty() && !name.is_empty() {
                    plans.push(PowerPlan {
                        guid,
                        name,
                        is_active,
                    });
                }
            }
        }
    }

    plans
}

/// 获取所有电源计划
#[command]
pub async fn get_power_plans() -> Result<Vec<PowerPlan>, String> {
    info!("[电源] 获取电源计划列表");
    let output = run_powercfg(&["/list"])?;
    let plans = parse_power_plans(&output);
    info!("[电源] 找到 {} 个电源计划", plans.len());
    Ok(plans)
}

/// 获取当前活动的电源计划
#[command]
pub async fn get_active_power_plan() -> Result<PowerPlan, String> {
    info!("[电源] 获取活动电源计划");
    let output = run_powercfg(&["/getactivescheme"])?;

    for line in output.lines() {
        let line = line.trim();
        if let Some(guid_start) = line.find('{') {
            if let Some(guid_end) = line.find('}') {
                let guid = line[guid_start + 1..guid_end].to_string();
                let name = line[guid_end + 1..].trim().trim_start_matches('(').trim_end_matches(')').trim().to_string();
                return Ok(PowerPlan { guid, name, is_active: true });
            }
        }
    }
    Err("无法获取活动电源计划".to_string())
}

/// 切换电源计划
#[command]
pub async fn set_active_power_plan(guid: String) -> Result<String, String> {
    info!("[电源] 切换电源计划到: {}", guid);
    let output = run_powercfg(&["/setactive", &guid])?;
    Ok(format!("已切换到电源计划: {}", guid))
}

/// 创建新电源计划 (基于现有计划复制)
#[command]
pub async fn create_power_plan(name: String, base_scheme_guid: String) -> Result<PowerPlan, String> {
    info!("[电源] 创建新电源计划: {} (基于 {})", name, base_scheme_guid);
    let output = run_powercfg(&["/duplicatescheme", &base_scheme_guid])?;

    // 输出格式: 电源方案 GUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  (名称)
    for line in output.lines() {
        let line = line.trim();
        if let Some(guid_start) = line.find(|c: char| c == '{' || c.is_ascii_hexdigit()) {
            let rest = &line[guid_start..];
            let clean = rest.trim_start_matches('{');
            let clean = if clean.len() > rest.len() { rest } else { clean };
            let clean = clean.trim_end_matches('}');

            if clean.len() == 36 && clean.chars().filter(|&c| c == '-').count() == 4 {
                let guid = clean.to_string();
                // 设置名称
                let _ = run_powercfg(&["/changename", &guid, &name]);
                return Ok(PowerPlan {
                    guid,
                    name,
                    is_active: false,
                });
            }
        }
    }

    Err("创建电源计划失败: 无法解析 GUID".to_string())
}

/// 删除电源计划
#[command]
pub async fn delete_power_plan(guid: String) -> Result<String, String> {
    info!("[电源] 删除电源计划: {}", guid);
    run_powercfg(&["/delete", &guid])?;
    Ok(format!("已删除电源计划: {}", guid))
}

/// 获取电源方案详细设置 (处理器相关)
#[command]
pub async fn get_processor_power_settings(scheme_guid: String) -> Result<ProcessorPowerSettings, String> {
    info!("[电源] 获取处理器电源设置: {}", scheme_guid);

    // 电源子组 GUID
    // 54533251-82be-4824-96c1-47b60b740d00 = 处理器电源管理
    let subgroup = "54533251-82be-4824-96c1-47b60b740d00";
    // 设置 GUID:
    // 893dee8e-2bef-41e0-89c6-b55d0929964c = 最小处理器状态
    // bc5038f7-23e0-4960-96da-33abaf5935ec = 最大处理器状态
    // 94d3a615-a899-4ac5-ae2b-e4d8f634367f = 系统散热策略
    // be337238-0d82-4146-a960-4f3749d470c7 = 处理器性能提升模式

    let mut settings = ProcessorPowerSettings {
        min_processor_state: None,
        max_processor_state: None,
        system_cooling_policy: None,
        processor_boost_mode: None,
    };

    let setting_guids = [
        ("893dee8e-2bef-41e0-89c6-b55d0929964c", "min"),
        ("bc5038f7-23e0-4960-96da-33abaf5935ec", "max"),
        ("94d3a615-a899-4ac5-ae2b-e4d8f634367f", "cooling"),
        ("be337238-0d82-4146-a960-4f3749d470c7", "boost"),
    ];

    for (guid, field) in &setting_guids {
        if let Ok(output) = run_powercfg(&[
            "/query", &scheme_guid, subgroup, guid
        ]) {
            // 解析 "当前交流电源设置索引: 0x00000064 (100)"
            for line in output.lines() {
                let line = line.trim();
                if line.contains("当前交流电源设置索引") || line.contains("Current AC Power Setting Index") {
                    if let Some(hex_start) = line.find("0x") {
                        let hex_str = &line[hex_start + 2..];
                        let hex_str = hex_str.split_whitespace().next().unwrap_or(hex_str);
                        if let Ok(val) = u32::from_str_radix(hex_str.trim_end_matches(')'), 16) {
                            match *field {
                                "min" => settings.min_processor_state = Some(val),
                                "max" => settings.max_processor_state = Some(val),
                                "cooling" => settings.system_cooling_policy = Some(val),
                                "boost" => settings.processor_boost_mode = Some(val),
                                _ => {}
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(settings)
}

/// 设置处理器电源参数
#[command]
pub async fn set_processor_power_settings(
    scheme_guid: String,
    settings: ProcessorPowerSettings,
) -> Result<String, String> {
    info!("[电源] 设置处理器电源参数: {:?}", settings);

    let subgroup = "54533251-82be-4824-96c1-47b60b740d00";

    if let Some(val) = settings.min_processor_state {
        let guid = "893dee8e-2bef-41e0-89c6-b55d0929964c";
        let val_str = val.to_string();
        run_powercfg(&["/setacvalueindex", &scheme_guid, subgroup, guid, &val_str])?;
        run_powercfg(&["/setdcvalueindex", &scheme_guid, subgroup, guid, &val_str])?;
    }

    if let Some(val) = settings.max_processor_state {
        let guid = "bc5038f7-23e0-4960-96da-33abaf5935ec";
        let val_str = val.to_string();
        run_powercfg(&["/setacvalueindex", &scheme_guid, subgroup, guid, &val_str])?;
        run_powercfg(&["/setdcvalueindex", &scheme_guid, subgroup, guid, &val_str])?;
    }

    if let Some(val) = settings.system_cooling_policy {
        let guid = "94d3a615-a899-4ac5-ae2b-e4d8f634367f";
        let val_str = val.to_string();
        run_powercfg(&["/setacvalueindex", &scheme_guid, subgroup, guid, &val_str])?;
        run_powercfg(&["/setdcvalueindex", &scheme_guid, subgroup, guid, &val_str])?;
    }

    if let Some(val) = settings.processor_boost_mode {
        let guid = "be337238-0d82-4146-a960-4f3749d470c7";
        let val_str = val.to_string();
        run_powercfg(&["/setacvalueindex", &scheme_guid, subgroup, guid, &val_str])?;
        run_powercfg(&["/setdcvalueindex", &scheme_guid, subgroup, guid, &val_str])?;
    }

    // 切换到当前方案使其生效
    let _ = run_powercfg(&["/setactive", &scheme_guid]);

    Ok("处理器电源设置已更新".to_string())
}

/// 获取电源方案详细设置
#[command]
pub async fn get_power_scheme_details(scheme_guid: String) -> Result<PowerSchemeDetails, String> {
    let processor = get_processor_power_settings(scheme_guid.clone()).await?;
    Ok(PowerSchemeDetails {
        scheme_guid,
        processor,
    })
}
