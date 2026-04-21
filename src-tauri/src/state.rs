//! Shared application state — data models and runtime settings.

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
    /// ใช้ Option เพื่อให้ Folder มีลูกได้ หรือโหนดปกติเป็น None
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

// ── Runtime state (not persisted) ────────────────────────────────────────────

/// Managed Tauri state
pub struct AppState {
    /// Hotkey หลัก (เช่น "Control+Shift+Q" ตามที่เราแก้บน Mac)
    pub active_hotkey: Mutex<String>,
    /// เก็บ ID ของโปรไฟล์ที่กำลังใช้งานอยู่ เพื่อให้ Frontend ไฮไลท์ถูก
    pub active_profile_id: Mutex<String>,
}

impl Default for AppState {
    fn default() -> Self {
        AppState {
            // ปรับ Default ให้ตรงกับปุ่มลัดที่เราแก้ไปบน Mac
            active_hotkey: Mutex::new("Control+Shift+Q".to_string()),
            active_profile_id: Mutex::new("global".to_string()),
        }
    }
}
