use crate::actions;
use crate::state::{ActionSlice, ActionType, AppState, Profile};
use crate::storage;
use crate::window_manager;
use dotenvy::dotenv;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Emitter;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_dialog::DialogExt;
use lettre::message::header::ContentType;


#[derive(Deserialize)]
struct MacroStep {
    #[serde(rename = "type")]
    step_type: String,
    data: String,
}

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[derive(Serialize, Deserialize)]
pub struct AppInfo {
    name: String,
    path: String,
}

#[tauri::command]
pub fn hide_action_ring(app: AppHandle) -> Result<(), String> {
    window_manager::hide_action_ring(&app).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn execute_action(_app: tauri::AppHandle, action: ActionSlice) -> Result<(), String> {
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
        ActionType::Folder => Ok(()),
        ActionType::TextSnippet => {
            let text = action.action_data.unwrap_or_default();
            tokio::task::spawn_blocking(move || actions::type_text_snippet(&text))
                .await
                .map_err(|e| format!("snippet task panicked: {e}"))
                .and_then(|r| r)
        }
        ActionType::Media => {
            let cmd = action.action_data.unwrap_or_default();
            tokio::task::spawn_blocking(move || actions::run_media_command(&cmd))
                .await
                .map_err(|e| format!("media task panicked: {e}"))
                .and_then(|r| r)
        }
        ActionType::System => {
            let cmd = action.action_data.unwrap_or_default();
            tokio::task::spawn_blocking(move || actions::run_system_command(&cmd))
                .await
                .map_err(|e| format!("system task panicked: {e}"))
                .and_then(|r| r)
        }
        ActionType::SwitchProfile => {
            let target_profile = action.action_data.unwrap_or_default();
            use tauri::Emitter;
            let _ = _app.emit("switch_profile", target_profile);
            Ok(())
        }

        ActionType::OpenApp => {
            let data = action.action_data.unwrap_or_else(|| "[]".to_string());
            if let Ok(paths) = serde_json::from_str::<Vec<String>>(&data) {
                for path in paths {
                    #[cfg(target_os = "windows")]
                    let _ = std::process::Command::new(&path).spawn();

                    #[cfg(target_os = "macos")]
                    let _ = std::process::Command::new("open").arg(&path).spawn();
                }
            }
            Ok(())
        }

        ActionType::OpenControlPanel => {
            if let Some(window) = _app.get_webview_window("main") {
                let _ = window.unminimize(); 
                let _ = window.show();
                let _ = window.set_focus();
            } else {
                let _ = tauri::WebviewWindowBuilder::new(
                    &_app,
                    "main",
                    tauri::WebviewUrl::App("index.html".into()),
                )
                .title("OrbitKey — Control Panel")
                .inner_size(1000.0, 700.0)
                .build();
            }
            Ok(())
        }

        ActionType::MultiAction => {
            let json_data = action.action_data.unwrap_or_else(|| "[]".to_string());

            let steps: Vec<MacroStep> = match serde_json::from_str(&json_data) {
                Ok(s) => s,
                Err(e) => return Err(format!("Failed to parse macro JSON: {e}")),
            };

            for step in steps {
                let data = step.data.clone();
                match step.step_type.as_str() {
                    "delay" => {
                        let ms: u64 = data.parse().unwrap_or(0);
                        tokio::time::sleep(std::time::Duration::from_millis(ms)).await;
                    }
                    "shortcut" => {
                        let _ = tokio::task::spawn_blocking(move || actions::simulate_shortcut(&data)).await;
                    }
                    "launch" => {
                        let _ = tokio::task::spawn_blocking(move || actions::launch_target(&data)).await;
                    }
                    "script" => {
                        let _ = tokio::task::spawn_blocking(move || actions::run_script(&data, &[])).await;
                    }
                    "text_snippet" => {
                        let _ = tokio::task::spawn_blocking(move || actions::type_text_snippet(&data)).await;
                    }
                    "media" => {
                        let _ = tokio::task::spawn_blocking(move || actions::run_media_command(&data)).await;
                    }
                    "system" => {
                        let _ = tokio::task::spawn_blocking(move || actions::run_system_command(&data)).await;
                    }
                    "switch_profile" => {
                        use tauri::Emitter;
                        let _ = _app.emit("switch_profile", data);
                    }
                    "open_app" => {
                        if let Ok(paths) = serde_json::from_str::<Vec<String>>(&data) {
                            for path in paths {
                                #[cfg(target_os = "windows")]
                                let _ = std::process::Command::new(&path).spawn();

                                #[cfg(target_os = "macos")]
                                let _ = std::process::Command::new("open").arg(&path).spawn();
                            }
                        }
                    }
                    "open_control_panel" => {
                        if let Some(window) = _app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        } else {
                            let _ = tauri::WebviewWindowBuilder::new(
                                &_app,
                                "main",
                                tauri::WebviewUrl::App("index.html".into()),
                            )
                            .title("Action Ring — Control Panel")
                            .inner_size(1000.0, 700.0)
                            .build();
                        }
                    }
                    _ => {
                        println!("[action-ring] Unknown macro step type: {}", step.step_type);
                    }
                }
            }
            Ok(())
        }
    };

    if let Err(e) = &result {
        println!("[action-ring] execute_action failed — {e}");
    }
    result
}

pub const DEFAULT_PROFILES_JSON: &str = include_str!("../default_profiles.json");

#[tauri::command]
pub fn get_default_config() -> String {
    DEFAULT_PROFILES_JSON.to_string()
}

#[tauri::command]
pub fn get_profiles(app: AppHandle) -> Vec<Profile> {
    let config_path = app.path().app_config_dir().unwrap().join("profiles.json");

    if config_path.exists() {
        let data = std::fs::read_to_string(config_path).unwrap_or_else(|_| "[]".to_string());
        serde_json::from_str::<Vec<Profile>>(&data).unwrap_or_else(|e| {
            println!("Profile JSON Error: {}", e);
            vec![]
        })
    } else {
        let default_data = include_str!("../default_profiles.json");
        match serde_json::from_str::<Vec<Profile>>(default_data) {
            Ok(profiles) => profiles,
            Err(e) => {
                println!("Error parsing default JSON: {}", e);
                vec![]
            }
        }
    }
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

use crate::state::AppSettings;

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<AppSettings, String> {
    storage::load_settings(&app)
}

#[tauri::command]
pub fn save_settings(
    app: AppHandle,
    state: State<'_, AppState>,
    settings: AppSettings,
) -> Result<(), String> {
    storage::write_settings(&app, &settings)?;

    let mut current_hotkey = state.active_hotkey.lock().unwrap();
    if *current_hotkey != settings.global_hotkey {
        let _ = crate::hotkey::update_hotkey(&app, &current_hotkey, &settings.global_hotkey);
        *current_hotkey = settings.global_hotkey.clone();
    }

    let autostart_manager = app.autolaunch();
    if settings.start_with_os {
        let _ = autostart_manager.enable();
    } else {
        let _ = autostart_manager.disable();
    }

    Ok(())
}

#[tauri::command]
pub async fn export_profile(app: AppHandle, profile: Profile) -> Result<(), String> {
    let json_string = serde_json::to_string_pretty(&profile)
        .map_err(|e| format!("Failed to serialize profile: {}", e))?;

    let result = app
        .dialog()
        .file()
        .set_file_name(&format!("{}.json", profile.name))
        .set_title("Export Profile")
        .add_filter("JSON Files", &["json"])
        .blocking_save_file();

    if let Some(path) = result {
        let path_buf = path
            .into_path()
            .map_err(|_| "Invalid file path".to_string())?;
        std::fs::write(&path_buf, json_string).map_err(|e| format!("Failed to write: {}", e))?;
        Ok(())
    } else {
        println!("[action-ring] Export cancelled");
        Ok(())
    }
}

#[tauri::command]
pub async fn import_profile(app: AppHandle) -> Result<Profile, String> {
    let result = app
        .dialog()
        .file()
        .set_title("Import Profile")
        .add_filter("JSON Files", &["json"])
        .blocking_pick_file();

    if let Some(path) = result {
        let path_buf = path
            .into_path()
            .map_err(|_| "Invalid file path".to_string())?;
        let json_string =
            std::fs::read_to_string(&path_buf).map_err(|e| format!("Failed to read: {}", e))?;
        let profile: Profile = serde_json::from_str(&json_string)
            .map_err(|e| format!("Failed to deserialize: {}", e))?;
        Ok(profile)
    } else {
        Err("Import cancelled".to_string())
    }
}

#[tauri::command]
pub fn open_accessibility_settings() {
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
            .spawn();
    }
}

#[tauri::command]
pub async fn export_all_data(app: AppHandle) -> Result<(), String> {
    let profiles = storage::load_profiles(&app)?;
    let settings = storage::load_settings(&app)?;

    let export_obj = json!({
        "profiles": profiles,
        "settings": settings
    });

    let json_string = serde_json::to_string_pretty(&export_obj)
        .map_err(|e| format!("Failed to serialize data: {}", e))?;

    let result = app
        .dialog()
        .file()
        .set_file_name("action_ring_backup.json")
        .set_title("Export All Data")
        .add_filter("JSON Files", &["json"])
        .blocking_save_file();

    if let Some(path) = result {
        let path_buf = path
            .into_path()
            .map_err(|_| "Invalid file path".to_string())?;
        std::fs::write(&path_buf, json_string).map_err(|e| format!("Failed to write: {}", e))?;
        Ok(())
    } else {
        Err("Export cancelled".to_string())
    }
}

#[tauri::command]
pub async fn import_all_data(app: AppHandle) -> Result<(), String> {
    let result = app
        .dialog()
        .file()
        .set_title("Import All Data")
        .add_filter("JSON Files", &["json"])
        .blocking_pick_file();

    if let Some(path) = result {
        let path_buf = path
            .into_path()
            .map_err(|_| "Invalid file path".to_string())?;
        let json_string =
            std::fs::read_to_string(&path_buf).map_err(|e| format!("Failed to read: {}", e))?;

        let parsed: serde_json::Value = serde_json::from_str(&json_string)
            .map_err(|e| format!("Invalid JSON format: {}", e))?;

        if let Some(profiles_val) = parsed.get("profiles") {
            let profiles: Vec<Profile> = serde_json::from_value(profiles_val.clone())
                .map_err(|_| "Failed to parse profiles".to_string())?;
            storage::write_profiles(&app, &profiles)?;
        }

        if let Some(settings_val) = parsed.get("settings") {
            let settings: AppSettings = serde_json::from_value(settings_val.clone())
                .map_err(|_| "Failed to parse settings".to_string())?;
            storage::write_settings(&app, &settings)?;

            let state = app.state::<AppState>();
            let mut current_hotkey = state.active_hotkey.lock().unwrap();
            let _ = crate::hotkey::update_hotkey(&app, &current_hotkey, &settings.global_hotkey);
            *current_hotkey = settings.global_hotkey.clone();
        }

        Ok(())
    } else {
        Err("Import cancelled".to_string())
    }
}

#[tauri::command]
pub async fn factory_reset(app: AppHandle) -> Result<(), String> {
    use crate::state::AppSettings;

    let default_profiles: Vec<Profile> = serde_json::from_str(DEFAULT_PROFILES_JSON)
        .map_err(|e| format!("Default JSON error: {}", e))?;

    let default_settings = AppSettings::default();

    storage::write_profiles(&app, &default_profiles)?;
    storage::write_settings(&app, &default_settings)?;

    Ok(())
}

#[tauri::command]
pub fn get_installed_apps() -> Vec<AppInfo> {
    let mut apps = Vec::new();

    #[cfg(target_os = "windows")]
    {
        let ps_script = r#"
            [Console]::OutputEncoding = [System.Text.Encoding]::UTF8;
            $sh = New-Object -ComObject WScript.Shell;
            $paths = @("$env:ProgramData\Microsoft\Windows\Start Menu\Programs", "$env:APPDATA\Microsoft\Windows\Start Menu\Programs");
            $results = @();
            foreach ($path in $paths) {
                if (Test-Path $path) {
                    Get-ChildItem -Path $path -Recurse -Filter *.lnk -ErrorAction SilentlyContinue | ForEach-Object {
                        $link = $sh.CreateShortcut($_.FullName);
                        $target = $link.TargetPath;
                        if ($target -match '\.exe$' -and $_.BaseName -notmatch '(?i)uninstall|setup|help|url|unins|settings') {
                            $results += [PSCustomObject]@{ name = $_.BaseName; path = $target }
                        }
                    }
                }
            }
            @($results) | Sort-Object name -Unique | ConvertTo-Json -Compress
        "#;

        let mut cmd = std::process::Command::new("powershell");
        cmd.args(["-NoProfile", "-Command", ps_script]);

        #[cfg(windows)]
        std::os::windows::process::CommandExt::creation_flags(&mut cmd, 0x08000000);

        if let Ok(output) = cmd.output() {
            if let Ok(json_str) = String::from_utf8(output.stdout) {
                if let Ok(parsed_apps) = serde_json::from_str::<Vec<AppInfo>>(&json_str) {
                    apps = parsed_apps;
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        use std::fs;
        if let Ok(entries) = fs::read_dir("/Applications") {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().map_or(false, |ext| ext == "app") {
                    if let Some(name) = path.file_stem().and_then(|n| n.to_str()) {
                        apps.push(AppInfo {
                            name: name.to_string(),
                            path: path.to_string_lossy().to_string(),
                        });
                    }
                }
            }
        }
    }

    apps.sort_by(|a, b| a.name.cmp(&b.name));
    apps.dedup_by(|a, b| a.name == b.name);

    apps
}

#[tauri::command]
pub fn show_control_panel(handle: tauri::AppHandle) {
    if let Some(window) = handle.get_webview_window("main") {
        let _ = window.unminimize(); // 💥 เพิ่มบรรทัดนี้ครับ!
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[tauri::command]
pub async fn send_bug_report(
    app: tauri::AppHandle, 
    user_email: String, 
    description: String
) -> Result<String, String> {
    
    dotenvy::dotenv().ok();
    dotenvy::from_path(std::path::Path::new(".env")).ok();
    dotenvy::from_path(std::path::Path::new("src-tauri/.env")).ok();

    let smtp_email =
        std::env::var("SMTP_EMAIL").map_err(|_| "Error: SMTP_EMAIL not found in environment")?;
    let smtp_password = std::env::var("SMTP_PASSWORD")
        .map_err(|_| "Error: SMTP_PASSWORD not found in environment")?;

    let app_version = app.package_info().version.to_string(); 
    let os_name = std::env::consts::OS; 
    let os_arch = std::env::consts::ARCH; 

    let template = include_str!("email_template.html");

    let html_body = template
        .replace("{{user_email}}", &user_email)
        .replace("{{description}}", &description)
        .replace("{{app_version}}", &app_version)
        .replace("{{os_name}}", os_name)
        .replace("{{os_arch}}", os_arch);

    let email = lettre::Message::builder()
        .from(
            format!("OrbitKey Reporter <{}>", smtp_email)
                .parse()
                .unwrap(),
        )
        .to("sonesambidev@gmail.com".parse().unwrap())
        .subject(format!("OrbitKey Bug Report (v{}) 🚀", app_version)) 
        .header(ContentType::TEXT_HTML)
        .body(html_body)
        .map_err(|e| e.to_string())?;

    let creds = lettre::transport::smtp::authentication::Credentials::new(smtp_email, smtp_password);

    let mailer = lettre::SmtpTransport::relay("smtp.gmail.com")
        .unwrap()
        .credentials(creds)
        .build();

    use lettre::Transport;
    match mailer.send(&email) {
        Ok(_) => Ok("Success".into()),
        Err(e) => Err(format!("Error: {e}")),
    }
}

#[tauri::command]
pub fn get_mouse_position(app: tauri::AppHandle) -> Result<(f64, f64), String> {
    use tauri::Manager;

    // 💥 ท่าไม้ตาย Windows: ดึงพิกัดเมาส์ระดับ OS (ทะลุกระจกใสได้ 100%)
    #[cfg(target_os = "windows")]
    {
        #[repr(C)]
        struct POINT { x: i32, y: i32 }
        
        #[link(name = "user32")]
        extern "system" { 
            fn GetCursorPos(lpPoint: *mut POINT) -> i32; 
        }

        let mut point = POINT { x: 0, y: 0 };
        unsafe { GetCursorPos(&mut point); } // ดึงเมาส์จากระบบ Windows โดยตรง!

        if let Some(window) = app.get_webview_window("action-ring") {
            if let Ok(win_pos) = window.outer_position() {
                let scale = window.scale_factor().unwrap_or(1.0);
                
                // คำนวณพิกัดเทียบกับกรอบ 800x800 ของเรา
                let local_x = (point.x as f64 - win_pos.x as f64) / scale;
                let local_y = (point.y as f64 - win_pos.y as f64) / scale;
                
                return Ok((local_x, local_y));
            }
        }
    }

    // 🍏 สำหรับ Mac: ดึงข้อมูลแบบเดิมที่ทำงานได้ลื่นอยู่แล้ว
    #[cfg(target_os = "macos")]
    {
        if let Some(window) = app.get_webview_window("action-ring") {
            if let Ok(pos) = window.cursor_position() {
                if let Ok(Some(monitor)) = window.current_monitor() {
                    let scale = window.scale_factor().unwrap_or(1.0);
                    let mon_pos = monitor.position();
                    let local_x = (pos.x as f64 - mon_pos.x as f64) / scale;
                    let local_y = (pos.y as f64 - mon_pos.y as f64) / scale;
                    return Ok((local_x, local_y));
                }
            }
        }
    }

    Err("Failed to get position".into())
}