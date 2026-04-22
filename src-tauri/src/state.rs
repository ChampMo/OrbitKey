// src-tauri/src/state.rs

use serde::{Deserialize, Serialize};
use std::sync::Mutex;

// ── Action types ──────────────────────────────────────────────────────────────
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ActionType {
    Shortcut,
    Launch,
    Script,
    Folder,
    TextSnippet,
    Media,
    System,
    SwitchProfile,
    MultiAction,
}

// ── Persistence types ────────────────────────────────────────────────────────
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionSlice {
    pub id: String,
    pub label: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub action_type: ActionType,
    pub action_data: Option<String>,
    #[serde(default)]
    pub script_args: Vec<String>,
    #[serde(default)]
    pub children: Option<Vec<ActionSlice>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub app_matcher: Option<String>,
    pub is_default: bool,
    pub slices: Vec<ActionSlice>,
}

// 🔥 [เพิ่มใหม่: สำหรับเก็บการตั้งค่าแอป] 🔥
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub global_hotkey: String,
    pub start_with_os: bool,
    pub ring_scale: i32,
    pub close_after_exec: bool,
    pub trigger_mode: String,
    pub anim_speed: String,
    pub deadzone: i32,
    pub center_action: String,
}

// ตั้งค่าเริ่มต้น (Default) เผื่อว่าแอปเปิดครั้งแรกแล้วยังไม่เคยตั้งค่า
impl Default for AppSettings {
    fn default() -> Self {
        Self {
            global_hotkey: "Control+Shift+Q".to_string(),
            start_with_os: false,
            ring_scale: 100,
            close_after_exec: true,
            trigger_mode: "click".to_string(),
            anim_speed: "spring".to_string(),
            deadzone: 30,
            center_action: "close".to_string(),
        }
    }
}

// ── Runtime state ────────────────────────────────────────────
pub struct AppState {
    pub active_hotkey: Mutex<String>,
    pub active_profile_id: Mutex<String>,
}

impl Default for AppState {
    fn default() -> Self {
        AppState {
            active_hotkey: Mutex::new("Control+Shift+Q".to_string()),
            active_profile_id: Mutex::new("global".to_string()),
        }
    }
}
