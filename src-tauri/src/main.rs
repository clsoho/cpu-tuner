#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;

fn main() {
    env_logger::Builder::from_env(
        env_logger::Env::default().default_filter_or("info")
    ).init();

    log::info!("🔧 CPU Tuner 启动");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            commands::power_plan::get_power_plans,
            commands::power_plan::get_active_power_plan,
            commands::power_plan::set_active_power_plan,
            commands::power_plan::create_power_plan,
            commands::power_plan::delete_power_plan,
            commands::power_plan::get_power_scheme_details,
            commands::power_plan::set_processor_power_settings,
            commands::power_plan::get_processor_power_settings,
            commands::monitor::get_cpu_info,
            commands::monitor::get_system_metrics,
        ])
        .run(tauri::generate_context!())
        .expect("运行 CPU Tuner 应用时发生错误");
}
