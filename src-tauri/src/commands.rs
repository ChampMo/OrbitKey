use crate::actions;
use crate::state::{ActionSlice, ActionType, AppState, Profile};
use crate::storage;
use crate::window_manager;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt; // สำหรับ Tauri v2 Dialog

#[tauri::command]
pub fn hide_action_ring(app: AppHandle) -> Result<(), String> {
    window_manager::hide_action_ring(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn execute_action(app: AppHandle, action: ActionSlice) -> Result<(), String> {
    window_manager::hide_action_ring(&app).map_err(|e| e.to_string())?;

    let result: Result<(), String> = match action.action_type {
        ActionType::Shortcut => {
            let data = action.action_data.unwrap_or_default();
            tokio::task::spawn_blocking(move || actions::simulate_shortcut(&data))
                .await
                .map_err(|e| format!("shortcut task panicked: {e}"))
                .and_then(|r| r)
        }
        ActionType::Launch => {
            let data = action.action_data.unwrap_or_default();
            tokio::task::spawn_blocking(move || actions::launch_target(&data))
                .await
                .map_err(|e| format!("launch task panicked: {e}"))
                .and_then(|r| r)
        }
        ActionType::Script => {
            let path = action.action_data.unwrap_or_default();
            let args = action.script_args;
            tokio::task::spawn_blocking(move || actions::run_script(&path, &args).map(|_| ()))
                .await
                .map_err(|e| format!("script task panicked: {e}"))
                .and_then(|r| r)
        }
        ActionType::Folder => {
            // โฟลเดอร์ไม่ต้องทำอะไรตอนรัน
            Ok(())
        }
    };

    if let Err(e) = &result {
        println!("[action-ring] execute_action failed — {e}");
    }
    result
}

#[tauri::command]
pub fn get_profiles(app: AppHandle) -> Result<Vec<Profile>, String> {
    storage::load_profiles(&app)
}

#[tauri::command]
pub fn save_profiles(app: tauri::AppHandle, profiles: Vec<Profile>) -> Result<(), String> {
    storage::write_profiles(&app, &profiles)
}

#[tauri::command]
pub fn get_hotkey(state: State<'_, AppState>) -> Result<String, String> {
    let hotkey = state.active_hotkey.lock().unwrap().clone();
    Ok(hotkey)
}

#[tauri::command]
pub fn get_active_hotkey(state: State<'_, AppState>) -> Result<String, String> {
    let hotkey = state.active_hotkey.lock().unwrap().clone();
    Ok(hotkey)
}

#[tauri::command]
pub fn set_hotkey(
    _app: AppHandle,
    state: State<'_, AppState>,
    new_hotkey: String,
) -> Result<(), String> {
    let mut hotkey = state.active_hotkey.lock().unwrap();
    *hotkey = new_hotkey.clone();
    // crate::hotkey::unregister_all(&app);
    // crate::hotkey::register_hotkey(&app, &new_hotkey);
    Ok(())
}

// ─── Tauri v2 Export / Import Profiles ─────────────────────────────────────

#[tauri::command]
pub async fn export_profile(app: AppHandle, profile: Profile) -> Result<(), String> {
    let json_string = serde_json::to_string_pretty(&profile)
        .map_err(|e| format!("Failed to serialize profile: {}", e))?;

    let result = app.dialog()
        .file()
        .set_file_name(&format!("{}.json", profile.name))
        .set_title("Export Profile")
        .add_filter("JSON Files", &["json"])
        .blocking_save_file();

    if let Some(path) = result {
        let path_buf = path.into_path().map_err(|_| "Invalid file path".to_string())?;
        std::fs::write(&path_buf, json_string)
            .map_err(|e| format!("Failed to write: {}", e))?;
        Ok(())
    } else {
        app.dialog()
            .message("Profile export was cancelled by the user.")
            .title("Export Cancelled")
            .blocking_show();
        Err("Export cancelled".to_string())
    }
}

#[tauri::command]
pub async fn import_profile(app: AppHandle) -> Result<Profile, String> {
    let result = app.dialog()
        .file()
        .set_title("Import Profile")
        .add_filter("JSON Files", &["json"])
        .blocking_pick_file();

    if let Some(path) = result {
        let path_buf = path.into_path().map_err(|_| "Invalid file path".to_string())?;
        let json_string = std::fs::read_to_string(&path_buf)
            .map_err(|e| format!("Failed to read: {}", e))?;
        let profile: Profile = serde_json::from_str(&json_string)
            .map_err(|e| format!("Failed to deserialize: {}", e))?;
        Ok(profile)
    } else {
        app.dialog()
            .message("Profile import was cancelled by the user.")
            .title("Import Cancelled")
            .blocking_show();
        Err("Import cancelled".to_string())
    }
}
