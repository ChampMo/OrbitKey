use tauri::Manager;
// 💥 1. เพิ่มบรรทัดนี้ เพื่อให้ระบบรู้จัก MacosLauncher
use tauri_plugin_autostart::MacosLauncher;

mod actions;
pub mod commands;
mod hotkey;
mod state;
mod storage;
mod window_manager;



#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 💥 2. ลบ Builder::new().build() ที่ซ้ำซ้อนออก เหลือแค่ตัว init() 
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .manage(state::AppState::default())
        .setup(|app| {
            // ✅ 1. ตั้งค่าเป็น Accessory (แอปเบื้องหลัง)
            let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
            if !config_dir.exists() {
                let _ = std::fs::create_dir_all(&config_dir);
            }

            let config_path = config_dir.join("profiles.json");
            // ถ้าเข้าแอปครั้งแรก (ยังไม่มีไฟล์) ให้เอาค่าจากไฟล์ default ไปเขียนใส่
            if !config_path.exists() {
                let _ = std::fs::write(config_path, commands::DEFAULT_PROFILES_JSON);
                println!("[action-ring] Initialized default profiles.");
            }

            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            if let Some(ring_window) = app.get_webview_window("action-ring") {
                // 3. Auto-hide เมื่อเสีย Focus (อันนี้เก็บไว้ได้ครับ)
                let ring_clone = ring_window.clone();
                ring_window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(false) = event {
                        let _ = ring_clone.hide();
                    }
                });
            }

            hotkey::setup_hotkeys(app.handle())?;
            println!("[action-ring] Setup complete.");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::hide_action_ring,
            commands::execute_action,
            commands::get_profiles,
            commands::save_profiles,
            commands::get_hotkey,
            commands::export_profile,
            commands::import_profile,
            commands::get_settings,
            commands::save_settings,
            commands::open_accessibility_settings,
            commands::export_all_data,
            commands::import_all_data,
            commands::factory_reset,
            commands::get_installed_apps,
            commands::show_control_panel,
            commands::get_default_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}