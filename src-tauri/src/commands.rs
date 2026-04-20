//! Tauri commands exposed to the React frontend via `invoke()`.
//!
//! ## Command catalogue
//!
//! | Command            | Async  | Description                                         |
//! |--------------------|--------|-----------------------------------------------------|
//! | `hide_action_ring` | no     | Hide the overlay window immediately                 |
//! | `execute_action`   | **yes**| Dispatch a slice action (shortcut / launch / script)|
//! | `get_profiles`     | no     | Load profiles from `profiles.json` (or create default) |
//! | `save_profiles`    | no     | Persist the full profiles list to `profiles.json`   |
//! | `get_hotkey`       | no     | Return the current summon hotkey string             |

use std::time::Duration;

use tauri::{AppHandle, State};

use crate::{
    actions,
    state::{ActionType, AppState, Profile},
    storage, window_manager,
};

// ─── Action payload ───────────────────────────────────────────────────────────

/// Sent by React when the user clicks a slice.
///
/// Matches the TypeScript `ActionPayload` interface — only execution-relevant
/// fields; display fields (icon, color) stay in the frontend.
///
/// ## JSON wire format
/// ```json
/// { "actionType": "shortcut", "actionData": "ctrl+c",            "scriptArgs": [] }
/// { "actionType": "launch",   "actionData": "https://google.com", "scriptArgs": [] }
/// { "actionType": "script",   "actionData": "/path/to/run.py",   "scriptArgs": ["--verbose"] }
/// ```
#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionPayload {
    pub action_type: ActionType,
    pub action_data: String,
    #[serde(default)]
    pub script_args: Vec<String>,
}

// ─── Window control ───────────────────────────────────────────────────────────

/// Hide the Action Ring window.
///
/// Called by React when the user dismisses the ring without selecting a slice
/// (Escape key or click outside).  When a slice IS selected, [`execute_action`]
/// handles the hide internally, so React should not call this separately.
#[tauri::command]
pub fn hide_action_ring(app: AppHandle) -> Result<(), String> {
    window_manager::hide_action_ring(&app).map_err(|e| e.to_string())
}

// ─── Action execution ─────────────────────────────────────────────────────────

/// Execute the action associated with a clicked slice.
///
/// ## Flow
/// 1. Hide ring immediately (sync).
/// 2. `await` 100 ms so the OS can restore focus to the previous window.
/// 3. Dispatch on a `spawn_blocking` thread so enigo / Command::output()
///    never block Tauri's async event loop.
#[tauri::command]
pub async fn execute_action(app: AppHandle, action: ActionPayload) -> Result<(), String> {
    let label = format!("[{:?}] {:?}", action.action_type, action.action_data);

    window_manager::hide_action_ring(&app).map_err(|e| format!("hide ring: {e}"))?;

    tokio::time::sleep(Duration::from_millis(100)).await;

    let result: Result<(), String> = match action.action_type {
        ActionType::Shortcut => {
            let data = action.action_data;
            tokio::task::spawn_blocking(move || actions::simulate_shortcut(&data))
                .await
                .map_err(|e| format!("shortcut task panicked: {e}"))
                .and_then(|r| r)
        }
        ActionType::Launch => {
            let data = action.action_data;
            tokio::task::spawn_blocking(move || actions::launch_target(&data))
                .await
                .map_err(|e| format!("launch task panicked: {e}"))
                .and_then(|r| r)
        }
        ActionType::Script => {
            let path = action.action_data;
            let args = action.script_args;
            tokio::task::spawn_blocking(move || actions::run_script(&path, &args).map(|_| ()))
                .await
                .map_err(|e| format!("script task panicked: {e}"))
                .and_then(|r| r)
        }
    };

    if let Err(ref e) = result {
        eprintln!("[action-ring] execute_action failed — {label}: {e}");
    }
    result
}

// ─── Profile persistence ──────────────────────────────────────────────────────

/// Load all profiles from `profiles.json`.
///
/// On first launch (file absent) the factory defaults are written and returned.
/// The Action Ring calls this every time it is summoned to pick up changes
/// made in the Control Panel since the last show.
#[tauri::command]
pub fn get_profiles(app: AppHandle) -> Result<Vec<Profile>, String> {
    storage::load_profiles(&app)
}

/// Persist the complete profiles list to `profiles.json`.
///
/// The Control Panel sends the full updated list; the backend replaces the
/// file atomically so no partial writes occur.
#[tauri::command]
pub fn save_profiles(app: AppHandle, profiles: Vec<Profile>) -> Result<(), String> {
    storage::write_profiles(&app, &profiles)
}

// ─── Settings ─────────────────────────────────────────────────────────────────

/// Return the currently configured summon hotkey string (e.g. `"Alt+Q"`).
#[tauri::command]
pub fn get_hotkey(state: State<'_, AppState>) -> String {
    state.active_hotkey.lock().unwrap().clone()
}
