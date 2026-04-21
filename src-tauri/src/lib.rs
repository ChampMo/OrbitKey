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
        // ── Plugins ───────────────────────────────────────────────────────────
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        // ── Managed state ─────────────────────────────────────────────────────
        // Profiles live on disk (storage.rs); AppState only holds runtime settings.
        .manage(state::AppState::default())
        // ── App setup ─────────────────────────────────────────────────────────
        .setup(|app| {
            // Auto-hide the ring whenever it loses OS focus (user clicked away).
            if let Some(ring_window) = app.get_webview_window("action-ring") {
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
        // ── Commands ──────────────────────────────────────────────────────────
        .invoke_handler(tauri::generate_handler![
            commands::hide_action_ring,
            commands::execute_action,
            commands::get_profiles,
            commands::save_profiles,
            commands::get_hotkey,
            commands::export_profile,
            commands::import_profile,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
