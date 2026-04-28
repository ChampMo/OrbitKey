use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};
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
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .manage(state::AppState::default())
        .setup(|app| {
            // ==========================================================
            // 🌟 1. สร้าง Tray Icon & Menu (System Tray / Menu Bar)
            // ==========================================================
            let settings_item = MenuItem::with_id(app, "settings", "Control Panel", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit OrbitKey", true, None::<&str>)?;
            
            let menu = Menu::with_items(app, &[&settings_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone()) // ดึงรูปไอคอนหลักของแอปมาใช้
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        std::process::exit(0);
                    }
                    "settings" => {
                        // ดึงหน้าต่าง Control Panel ขึ้นมาโชว์ (อิงจากชื่อหน้าต่าง "main")
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        } else {
                            // ถ้าหน้าต่างถูกปิดไปแล้ว ให้สร้างใหม่
                            let _ = tauri::WebviewWindowBuilder::new(
                                app,
                                "main",
                                tauri::WebviewUrl::App("index.html".into()),
                            )
                            .title("OrbitKey — Control Panel")
                            .inner_size(1000.0, 700.0)
                            .min_inner_size(800.0, 600.0)
                            .build();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            // ==========================================================
            // 📂 2. ตรวจสอบและสร้างไฟล์ Config เริ่มต้น (profiles.json)
            // ==========================================================
            let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
            if !config_dir.exists() {
                let _ = std::fs::create_dir_all(&config_dir);
            }

            let config_path = config_dir.join("profiles.json");
            if !config_path.exists() {
                let _ = std::fs::write(config_path, commands::DEFAULT_PROFILES_JSON);
                println!("[action-ring] Initialized default profiles.");
            }

            // ==========================================================
            // 🍏 3. ตั้งค่า macOS เป็น Accessory (ซ่อนจาก Dock)
            // ==========================================================
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // ==========================================================
            // 🪄 4. แปลงร่างหน้าต่าง Action Ring ทะลุเกราะ Fullscreen
            // ==========================================================
            if let Some(ring_window) = app.get_webview_window("action-ring") {
                #[cfg(target_os = "macos")]
                {
                    use objc::runtime::{Class, Object};
                    use objc::{msg_send, sel, sel_impl};

                    #[link(name = "objc")]
                    extern "C" {
                        fn object_setClass(obj: *mut Object, cls: *const Class) -> *const Class;
                    }

                    if let Ok(ns_win) = ring_window.ns_window() {
                        let ns_window = ns_win as *mut Object;
                        unsafe {
                            let nspanel_class = Class::get("NSPanel").unwrap();
                            object_setClass(ns_window, nspanel_class);

                            let style_mask: usize = msg_send![ns_window, styleMask];
                            let _: () = msg_send![ns_window, setStyleMask: style_mask | 128];

                            let behavior: usize = (1 << 0) | (1 << 8);
                            let _: () = msg_send![ns_window, setCollectionBehavior: behavior];

                            let _: () = msg_send![ns_window, setLevel: 21_isize];
                            let _: () = msg_send![ns_window, setAcceptsMouseMovedEvents: true];
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

            // ==========================================================
            // ⌨️ 5. ตั้งค่าปุ่มลัด (Global Hotkey)
            // ==========================================================
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
            commands::get_mouse_position,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}