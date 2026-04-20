//! Shared application state — data models and runtime settings.

use serde::{Deserialize, Serialize};
use std::sync::Mutex;

// ── Action types ──────────────────────────────────────────────────────────────

/// Discriminates which execution path `execute_action` takes.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ActionType {
    /// Simulate a keyboard shortcut (e.g. "ctrl+c")
    Shortcut,
    /// Open a URL, file, or executable
    Launch,
    /// Spawn an interpreter sub-process with a script file
    Script,
}

// ── Persistence types (serialised to / from profiles.json) ───────────────────

/// One action "wedge" in the ring.
///
/// Stored inside a [`Profile`] and persisted to `profiles.json`.
/// All `camelCase` field names match what TypeScript sends/receives.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionSlice {
    pub id: String,
    pub label: String,
    /// Emoji character shown inside the slice (e.g. "🌐")
    pub icon: Option<String>,
    /// Accent hex colour used for hover highlight (e.g. "#4285f4")
    pub color: Option<String>,
    pub action_type: ActionType,
    /// Shortcut string, URL/path, or script path depending on `action_type`
    pub action_data: String,
    /// Extra CLI args forwarded to the interpreter (Script actions only)
    #[serde(default)]
    pub script_args: Vec<String>,
}

/// A named collection of slices, optionally tied to a specific application.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    /// Human-readable name shown in the Control Panel
    pub name: String,
    /// Process/window-title substring used for app-specific matching (Step 5)
    pub app_matcher: Option<String>,
    /// When `true` this profile is shown when no app-specific match is found
    pub is_default: bool,
    pub slices: Vec<ActionSlice>,
}

// ── Runtime state (not persisted) ────────────────────────────────────────────

/// Managed Tauri state — only holds settings that don't live on disk.
pub struct AppState {
    /// The summon hotkey string, e.g. `"Alt+Q"`.  Configurable in Step 5.
    pub active_hotkey: Mutex<String>,
}

impl Default for AppState {
    fn default() -> Self {
        AppState {
            active_hotkey: Mutex::new("Alt+Q".to_string()),
        }
    }
}
