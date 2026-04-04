#[cfg(windows)]
use winreg::RegKey;
#[cfg(windows)]
use winreg::enums::*;

/// Check if CPU Tuner starts with Windows
pub fn is_autostart_enabled() -> bool {
    #[cfg(windows)]
    {
        if let Ok(key) = RegKey::predef(HKEY_CURRENT_USER)
            .open_subkey(r"Software\Microsoft\Windows\CurrentVersion\Run")
        {
            if let Ok(val) = key.get_value::<String, _>("CPUTuner") {
                return !val.is_empty();
            }
        }
    }
    false
}

/// Enable or disable Windows autostart
pub fn set_autostart(enabled: bool) -> Result<(), String> {
    #[cfg(windows)]
    {
        let key_path = r"Software\Microsoft\Windows\CurrentVersion\Run";
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        
        if enabled {
            let subkey = hkcu
                .open_subkey_with_flags(key_path, KEY_WRITE)
                .map_err(|e| format!("打开注册表失败: {}", e))?;
            
            // Get current executable path
            let exe_path = std::env::current_exe()
                .map_err(|e| format!("获取 exe 路径失败: {}", e))?;
            
            let path_str = format!("\"{}\"", exe_path.display());
            subkey
                .set_value("CPUTuner", &path_str)
                .map_err(|e| format!("写入注册表失败: {}", e))?;
        } else {
            let subkey = hkcu
                .open_subkey_with_flags(key_path, KEY_WRITE)
                .map_err(|e| format!("打开注册表失败: {}", e))?;
            
            let _ = subkey.delete_value("CPUTuner");
        }
        
        Ok(())
    }
    
    #[cfg(not(windows))]
    {
        let _ = enabled;
        Ok(())
    }
}

#[tauri::command]
pub async fn check_autostart() -> bool {
    is_autostart_enabled()
}

#[tauri::command]
pub async fn set_autostart_cmd(enabled: bool) -> Result<(), String> {
    set_autostart(enabled)
}
