// src-tauri/src/lib.rs

use tauri::Manager;

mod actions;
mod commands;
mod hotkey;
mod state;
mod storage;
mod window_manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .manage(state::AppState::default())
        .setup(|app| {
            // ✅ 1. ตั้งค่าเป็น Accessory (แอปเบื้องหลัง) - อันนี้ต้องอยู่ที่นี่ถูกแล้วครับ
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            
            if let Some(ring_window) = app.get_webview_window("action-ring") {
                // ✅ 2. ย้ายส่วน objc ออกไป (เดี๋ยวเราเอาไปใส่ในฟังก์ชันที่สั่ง show แทน)

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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}