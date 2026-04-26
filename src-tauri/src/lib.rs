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
    dotenvy::dotenv().ok();
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_process::init())
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
    
                #[cfg(target_os = "macos")]
                {
                    use objc::runtime::{Class, Object};
                    use objc::{msg_send, sel, sel_impl};

                    // 💥 นำเข้าคำสั่งระดับลึกของระบบ Mac เพื่อเปลี่ยน Class ของหน้าต่าง
                    #[link(name = "objc")]
                    extern "C" {
                        fn object_setClass(obj: *mut Object, cls: *const Class) -> *const Class;
                    }

                    if let Ok(ns_win) = ring_window.ns_window() {
                        let ns_window = ns_win as *mut Object;
                        unsafe {
                            // 1. 🪄 แปลงร่างจาก NSWindow เป็น NSPanel 
                            let nspanel_class = Class::get("NSPanel").unwrap();
                            object_setClass(ns_window, nspanel_class);

                            // 2. ใส่ StyleMask: NonactivatingPanel (128) เพื่อไม่ให้แย่งโฟกัสแอปอื่น
                            let style_mask: usize = msg_send![ns_window, styleMask];
                            let _: () = msg_send![ns_window, setStyleMask: style_mask | 128];

                            // 3. ทะลุเกราะ Fullscreen (CanJoinAllSpaces | FullScreenAuxiliary)
                            let behavior: usize = (1 << 0) | (1 << 8);
                            let _: () = msg_send![ns_window, setCollectionBehavior: behavior];

                            // 4. ดันความลอยให้อยู่สูงสุด
                            let _: () = msg_send![ns_window, setLevel: 21_isize];

                            // 5. อนุญาตให้รับ Event เมาส์ได้แม้ไม่ได้กดโฟกัส
                            let _: () = msg_send![ns_window, setAcceptsMouseMovedEvents: true];

                            // 6. ปิดเงาให้ดูคลีนและไม่ค้าง
                            let _: () = msg_send![ns_window, setHasShadow: false];
                        }
                    }
                }

                // Auto-hide เมื่อเสีย Focus
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
            commands::send_bug_report,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}