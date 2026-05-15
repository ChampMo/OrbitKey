use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::{fs, path::PathBuf};
use tauri::AppHandle;
use tauri::Manager;

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
    OpenApp,
    OpenControlPanel,
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

// 🔥 [อัปเดต: เพิ่ม start_hidden เข้ามาแล้ว] 🔥
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct AppSettings {
    pub global_hotkey: String,
    pub start_with_os: bool,
    pub ring_scale: i32,
    pub close_after_exec: bool,
    pub trigger_mode: String,
    pub anim_speed: String,
    pub deadzone: i32,
    pub center_action: String,
    #[serde(default = "default_theme")]
    pub theme: String,
    pub switch_anim_style: String,
    pub start_hidden: bool, // 💥 เพิ่มบรรทัดนี้
}

fn default_theme() -> String {
    "dark".to_string()
}

// ตั้งค่าเริ่มต้น (Default)
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
            theme: "dark".to_string(),
            switch_anim_style: "quantum-pop".to_string(),
            start_hidden: true, // 💥 ตั้งค่าเริ่มต้นเป็น true (แอบซุ่มไว้ก่อน)
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

// ─── Path helper ──────────────────────────────────────────────────────────────
fn profiles_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Cannot resolve app-data directory: {e}"))?;

    fs::create_dir_all(&dir).map_err(|e| {
        format!("Cannot create app-data directory at '{}': {e}", dir.display())
    })?;

    Ok(dir.join("profiles.json"))
}

// ─── Public API ───────────────────────────────────────────────────────────────
pub fn load_profiles(app: &AppHandle) -> Result<Vec<Profile>, String> {
    let path = profiles_path(app)?;

    if !path.exists() {
        let defaults = default_profiles();
        write_profiles(app, &defaults)?;
        println!("[action-ring] First launch — wrote default profiles to '{}'", path.display());
        return Ok(defaults);
    }

    let json = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read '{}': {e}", path.display()))?;

    serde_json::from_str::<Vec<Profile>>(&json)
        .map_err(|e| format!("'{}' contains invalid JSON: {e}", path.display()))
}

pub fn write_profiles(app: &AppHandle, profiles: &[Profile]) -> Result<(), String> {
    let path = profiles_path(app)?;
    let json = serde_json::to_string_pretty(profiles)
        .map_err(|e| format!("Failed to serialise profiles: {e}"))?;

    fs::write(&path, json).map_err(|e| format!("Failed to write '{}': {e}", path.display()))?;

    println!("[action-ring] Profiles saved → '{}' ({} profile(s))", path.display(), profiles.len());
    Ok(())
}

// ─── Default profiles ─────────────────────────────────────────────────────────
pub fn default_profiles() -> Vec<Profile> {
    vec![Profile {
        id: "global".to_string(),
        name: "Global".to_string(),
        app_matcher: None,
        is_default: true,
        slices: vec![
            mk("browser", "Browser", "🌐", "#4285f4", ActionType::Launch, "https://google.com"),
            mk("vscode", "VS Code", "💻", "#0ea5e9", ActionType::Launch, "code"),
            mk("copy", "Copy", "📋", "#22c55e", ActionType::Shortcut, "ctrl+c"),
            mk("paste", "Paste", "📌", "#f59e0b", ActionType::Shortcut, "ctrl+v"),
            mk("screenshot", "Screenshot", "📷", "#ef4444", ActionType::Shortcut, "ctrl+shift+s"),
            mk("settings", "Settings", "⚙️", "#a78bfa", ActionType::Shortcut, "ctrl+comma"),
        ],
    }]
}

fn mk(id: &str, label: &str, icon: &str, color: &str, action_type: ActionType, action_data: &str) -> ActionSlice {
    ActionSlice {
        id: id.to_string(),
        label: label.to_string(),
        icon: Some(icon.to_string()),
        color: Some(color.to_string()),
        action_type,
        action_data: Some(action_data.to_string()),
        script_args: vec![],
        children: None,
    }
}

fn mk_folder(id: &str, label: &str, icon: &str, color: &str, children: Vec<ActionSlice>) -> ActionSlice {
    ActionSlice {
        id: id.to_string(),
        label: label.to_string(),
        icon: Some(icon.to_string()),
        color: Some(color.to_string()),
        action_type: ActionType::Folder,
        action_data: None,
        script_args: vec![],
        children: Some(children),
    }
}

// ─── Settings Persistence ──────────────────────────────────────────────────────
fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Cannot resolve app-data directory: {e}"))?;

    fs::create_dir_all(&dir).map_err(|e| {
        format!("Cannot create app-data directory at '{}': {e}", dir.display())
    })?;

    Ok(dir.join("settings.json"))
}

pub fn load_settings(app: &AppHandle) -> Result<AppSettings, String> {
    let path = settings_path(app)?;

    if !path.exists() {
        let defaults = AppSettings::default();
        write_settings(app, &defaults)?;
        return Ok(defaults);
    }

    let json = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read '{}': {e}", path.display()))?;

    serde_json::from_str::<AppSettings>(&json)
        .map_err(|e| format!("'{}' contains invalid JSON: {e}", path.display()))
}

pub fn write_settings(app: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    let path = settings_path(app)?;
    let json = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialise settings: {e}"))?;

    fs::write(&path, json).map_err(|e| format!("Failed to write '{}': {e}", path.display()))?;
    Ok(())
}