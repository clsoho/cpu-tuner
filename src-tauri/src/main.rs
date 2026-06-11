#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;
use tauri::image::Image;
use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Emitter, Listener, Manager, WindowEvent,
};

static SHOW_TRAY_STATUS: AtomicBool = AtomicBool::new(true);
static LAST_METRICS: Mutex<Option<commands::monitor::SystemSnapshot>> = Mutex::new(None);

fn build_tray_menu(app: &tauri::AppHandle) -> Result<Menu<tauri::Wry>, Box<dyn std::error::Error>> {
    use commands::profiles::ProfileConfig;
    let config = ProfileConfig::load().unwrap_or_else(|_| ProfileConfig::default_config());

    let p1 = format!("{} {}", config.profiles.get(&1).map(|p| p.icon.as_str()).unwrap_or(""), config.profiles.get(&1).map(|p| p.name.as_str()).unwrap_or("Profile 1"));
    let p2 = format!("{} {}", config.profiles.get(&2).map(|p| p.icon.as_str()).unwrap_or(""), config.profiles.get(&2).map(|p| p.name.as_str()).unwrap_or("Profile 2"));
    let p3 = format!("{} {}", config.profiles.get(&3).map(|p| p.icon.as_str()).unwrap_or(""), config.profiles.get(&3).map(|p| p.name.as_str()).unwrap_or("Profile 3"));
    let p4 = format!("{} {}", config.profiles.get(&4).map(|p| p.icon.as_str()).unwrap_or(""), config.profiles.get(&4).map(|p| p.name.as_str()).unwrap_or("Profile 4"));

    let menu = Menu::new(app)?;
    let item1 = MenuItem::with_id(app, "profile-1", p1, true, None::<&str>)?;
    let item2 = MenuItem::with_id(app, "profile-2", p2, true, None::<&str>)?;
    let item3 = MenuItem::with_id(app, "profile-3", p3, true, None::<&str>)?;
    let item4 = MenuItem::with_id(app, "profile-4", p4, true, None::<&str>)?;
    menu.append(&item1)?;
    menu.append(&item2)?;
    menu.append(&item3)?;
    menu.append(&item4)?;

    let sep = PredefinedMenuItem::separator(app)?;
    menu.append(&sep)?;

    // Toggle for metric tray icons
    let show = SHOW_TRAY_STATUS.load(Ordering::Relaxed);
    let toggle = CheckMenuItem::with_id(app, "toggle-status", "显示实时数据图表", true, show, None::<&str>)?;
    menu.append(&toggle)?;

    // Quit
    let sep3 = PredefinedMenuItem::separator(app)?;
    menu.append(&sep3)?;
    let item_quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    menu.append(&item_quit)?;

    Ok(menu)
}

fn update_metric_tray_icons(app: &tauri::AppHandle) {
    let show = SHOW_TRAY_STATUS.load(Ordering::Relaxed);
    let metrics = LAST_METRICS.lock().unwrap().clone();

    for (id, label_prefix, default) in [
        ("temp-metric", "温度", "N/A"),
        ("freq-metric", "频率", "N/A"),
        ("power-metric", "功耗", "N/A"),
    ] {
        if let Some(tray) = app.tray_by_id(id) {
            let value = match (id, &metrics) {
                ("temp-metric", Some(m)) => m.cpu_temp_c.map(|t| format!("{:.0}°C", t)).unwrap_or("N/A".into()),
                ("freq-metric", Some(m)) => format!("{} MHz", m.cpu_freq_current_mhz),
                ("power-metric", Some(m)) => m.package_power_w.map(|p| format!("{:.1}W", p)).unwrap_or("N/A".into()),
                _ => default.to_string(),
            };
            let _ = tray.set_tooltip(Some(&format!("{}: {}", label_prefix, value)));
            let _ = tray.set_visible(show);
        }
    }
}

fn main() {
    env_logger::Builder::from_env(
        env_logger::Env::default().default_filter_or("info"),
    )
    .init();

    log::info!("CPU Tuner 启动");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            commands::cpu::get_cpu_info,
            commands::monitor::get_system_metrics,
            commands::power_plan::get_power_plans,
            commands::power_plan::get_active_power_plan,
            commands::power_plan::set_active_power_plan,
            commands::power_plan::create_power_plan,
            commands::power_plan::delete_power_plan,
            commands::power_plan::get_power_scheme_details,
            commands::power_plan::get_processor_power_settings,
            commands::power_plan::set_processor_power_settings,
            commands::profiles::get_profiles,
            commands::profiles::update_profile,
            commands::profiles::apply_profile,
            commands::profiles::set_active_profile,
            commands::profiles::reset_profiles,
            commands::autostart::check_autostart,
            commands::autostart::set_autostart_cmd,
            commands::msr::get_tpl_settings,
            commands::msr::set_tpl_settings,
            commands::msr::get_fivr_data,
            commands::msr::set_fivr_offset,
            commands::msr::set_clock_modulation,
            commands::msr::run_ts_bench,
        ])
        .setup(|app| {
            // Build and set main tray icon
            let menu = build_tray_menu(app.handle())?;
            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("CPU Tuner")
                .on_menu_event(move |app, event| {
                    let id = event.id.as_ref();
                    match id {
                        "quit" => std::process::exit(0),
                        "toggle-status" => {
                            let current = SHOW_TRAY_STATUS.load(Ordering::Relaxed);
                            SHOW_TRAY_STATUS.store(!current, Ordering::Relaxed);
                            update_metric_tray_icons(app);
                            if let Ok(new_menu) = build_tray_menu(app) {
                                if let Some(tray) = app.tray_by_id("main") {
                                    let _ = tray.set_menu(Some(new_menu));
                                }
                            }
                        }
                        _ => {
                            if let Some(rest) = id.strip_prefix("profile-") {
                                if let Ok(profile_id) = rest.parse::<u32>() {
                                    let app_handle = app.clone();
                                    tauri::async_runtime::spawn(async move {
                                        let _ = commands::profiles::apply_profile(profile_id).await;
                                        let _ = app_handle.emit("profiles-updated", ());
                                        if let Ok(new_menu) = build_tray_menu(&app_handle) {
                                            if let Some(tray) = app_handle.tray_by_id("main") {
                                                let _ = tray.set_menu(Some(new_menu));
                                            }
                                        }
                                    });
                                }
                            }
                        }
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { button, .. } = event {
                        if button == tauri::tray::MouseButton::Left {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = if window.is_visible().unwrap_or(false) {
                                    window.hide()
                                } else {
                                    window.show().and_then(|_| window.set_focus())
                                };
                            }
                        }
                    }
                })
                .build(app)?;

            // Create 3 metric tray icons
            let show_init = SHOW_TRAY_STATUS.load(Ordering::Relaxed);
            let make_icon = |width: u32, height: u32, r: u8, g: u8, b: u8| -> Image<'static> {
                let mut pixels = vec![0u8; (width * height * 4) as usize];
                let cx = width as f32 / 2.0;
                let cy = height as f32 / 2.0;
                let radius = (width.min(height) as f32) * 0.42;
                for y in 0..height {
                    for x in 0..width {
                        let dx = x as f32 - cx;
                        let dy = y as f32 - cy;
                        if dx * dx + dy * dy <= radius * radius {
                            let idx = ((y * width + x) * 4) as usize;
                            pixels[idx] = r;
                            pixels[idx + 1] = g;
                            pixels[idx + 2] = b;
                            pixels[idx + 3] = 0xff;
                        }
                    }
                }
                Image::new_owned(pixels, width, height)
            };

            let t = TrayIconBuilder::with_id("temp-metric").icon(make_icon(16, 16, 0xf8, 0x51, 0x49)).tooltip("温度: N/A");
            let f = TrayIconBuilder::with_id("freq-metric").icon(make_icon(16, 16, 0x44, 0x93, 0xf8)).tooltip("频率: N/A");
            let p = TrayIconBuilder::with_id("power-metric").icon(make_icon(16, 16, 0x3f, 0xb9, 0x50)).tooltip("功耗: N/A");
            if let Ok(tray) = t.build(app) { let _ = tray.set_visible(show_init); }
            if let Ok(tray) = f.build(app) { let _ = tray.set_visible(show_init); }
            if let Ok(tray) = p.build(app) { let _ = tray.set_visible(show_init); }

            // Listen for profile updates from frontend
            let app_handle = app.handle().clone();
            app.handle().listen("profiles-updated", move |_| {
                if let Ok(new_menu) = build_tray_menu(&app_handle) {
                    if let Some(tray) = app_handle.tray_by_id("main") {
                        let _ = tray.set_menu(Some(new_menu));
                    }
                }
            });

            // Spawn tooltip + metric icon update task
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    match commands::monitor::get_system_metrics().await {
                        Ok(metrics) => {
                            // Cache for menu and tooltip use
                            *LAST_METRICS.lock().unwrap() = Some(metrics.clone());

                            let temp_str = match metrics.cpu_temp_c {
                                Some(t) => format!("{:.0}°C", t),
                                None => "N/A".to_string(),
                            };
                            let power_str = match metrics.package_power_w {
                                Some(p) => format!("{:.1}W", p),
                                None => "N/A".to_string(),
                            };
                            let tooltip = format!(
                                "CPU: {:.0}% | {} MHz | {} | {}",
                                metrics.cpu_usage_total, metrics.cpu_freq_current_mhz, temp_str, power_str
                            );
                            if let Some(tray) = app_handle.tray_by_id("main") {
                                let _ = tray.set_tooltip(Some(&tooltip));
                            }

                            // Update metric tray tooltips
                            update_metric_tray_icons(&app_handle);
                        }
                        Err(e) => log::warn!("Failed to fetch metrics for tray: {}", e),
                    }
                    tokio::time::sleep(Duration::from_secs(2)).await;
                }
            });

            // Handle window close: minimize to tray if configured
            if let Some(window) = app.get_webview_window("main") {
                let win_clone = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        let config = commands::profiles::ProfileConfig::load().unwrap_or_default();
                        if config.minimize_to_tray {
                            let _ = win_clone.hide();
                            api.prevent_close();
                        }
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("运行 CPU Tuner 应用时发生错误");
}
