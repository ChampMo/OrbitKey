//! Profile persistence — reads and writes `profiles.json` in the OS-appropriate
//! application-data directory.
//!
//! | Platform | Default location                                              |
//! |----------|---------------------------------------------------------------|
//! | Windows  | `%APPDATA%\com.actionring.app\profiles.json`                  |
//! | macOS    | `~/Library/Application Support/com.actionring.app/profiles.json` |
//! | Linux    | `~/.local/share/com.actionring.app/profiles.json`             |

use std::{fs, path::PathBuf};

use crate::state::{ActionSlice, ActionType, Profile};
use tauri::AppHandle;
use tauri::Manager;

// ─── Path helper ──────────────────────────────────────────────────────────────

/// Resolve the absolute path to `profiles.json`, creating all parent
/// directories if they do not already exist.
fn profiles_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Cannot resolve app-data directory: {e}"))?;

    fs::create_dir_all(&dir).map_err(|e| {
        format!(
            "Cannot create app-data directory at '{}': {e}",
            dir.display()
        )
    })?;

    Ok(dir.join("profiles.json"))
}

// ─── Public API ───────────────────────────────────────────────────────────────

/// Load all profiles from `profiles.json`.
///
/// **First launch**: if the file does not yet exist, [`default_profiles`] is
/// written to disk and returned so the user gets a useful set of slices
/// immediately without any configuration.
///
/// **Parse error**: if the file exists but is malformed, returns `Err` so the
/// caller (a Tauri command) can surface the message to the frontend.
pub fn load_profiles(app: &AppHandle) -> Result<Vec<Profile>, String> {
    let path = profiles_path(app)?;

    if !path.exists() {
        let defaults = default_profiles();
        write_profiles(app, &defaults)?;
        println!(
            "[action-ring] First launch — wrote default profiles to '{}'",
            path.display()
        );
        return Ok(defaults);
    }

    let json = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read '{}': {e}", path.display()))?;

    serde_json::from_str::<Vec<Profile>>(&json)
        .map_err(|e| format!("'{}' contains invalid JSON: {e}", path.display()))
}

/// Overwrite `profiles.json` with the given slice, creating it if necessary.
///
/// Called by the `save_profiles` Tauri command whenever the user clicks
/// **Save Changes** in the Control Panel.
pub fn write_profiles(app: &AppHandle, profiles: &[Profile]) -> Result<(), String> {
    let path = profiles_path(app)?;

    let json = serde_json::to_string_pretty(profiles)
        .map_err(|e| format!("Failed to serialise profiles: {e}"))?;

    fs::write(&path, json).map_err(|e| format!("Failed to write '{}': {e}", path.display()))?;

    println!(
        "[action-ring] Profiles saved → '{}' ({} profile(s))",
        path.display(),
        profiles.len()
    );
    Ok(())
}

// ─── Default profiles ─────────────────────────────────────────────────────────

/// The factory-default profile set written on first launch.
///
/// Contains a single "Global" profile with six slices covering the most
/// common quick-actions.  Users can replace these via the Control Panel.
pub fn default_profiles() -> Vec<Profile> {
    vec![Profile {
        id: "global".to_string(),
        name: "Global".to_string(),
        app_matcher: None,
        is_default: true,
        slices: vec![
            mk(
                "browser",
                "Browser",
                "🌐",
                "#4285f4",
                ActionType::Launch,
                "https://google.com",
            ),
            mk(
                "vscode",
                "VS Code",
                "💻",
                "#0ea5e9",
                ActionType::Launch,
                "code",
            ),
            mk(
                "copy",
                "Copy",
                "📋",
                "#22c55e",
                ActionType::Shortcut,
                "ctrl+c",
            ),
            mk(
                "paste",
                "Paste",
                "📌",
                "#f59e0b",
                ActionType::Shortcut,
                "ctrl+v",
            ),
            mk(
                "screenshot",
                "Screenshot",
                "📷",
                "#ef4444",
                ActionType::Shortcut,
                "ctrl+shift+s",
            ),
            mk(
                "settings",
                "Settings",
                "⚙️",
                "#a78bfa",
                ActionType::Shortcut,
                "ctrl+comma",
            ),
        ],
    }]
}

/// Convenience constructor for a fully-populated [`ActionSlice`].
fn mk(
    id: &str,
    label: &str,
    icon: &str,
    color: &str,
    action_type: ActionType,
    action_data: &str,
) -> ActionSlice {
    ActionSlice {
        id: id.to_string(),
        label: label.to_string(),
        icon: Some(icon.to_string()),
        color: Some(color.to_string()),
        action_type,
        action_data: action_data.to_string(),
        script_args: vec![],
    }
}
