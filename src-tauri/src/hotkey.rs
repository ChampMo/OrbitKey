// src-tauri/src/hotkey.rs

use tauri::AppHandle;
use tauri::Emitter;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState, Shortcut};
use std::str::FromStr;

use crate::{window_manager, storage, state::AppState};
use tauri::Manager;

pub fn setup_hotkeys(handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let app = handle.clone();
    
    // 1. ตอนเปิดแอป ให้ไปอ่านปุ่มจาก settings.json
    let settings = storage::load_settings(&app).unwrap_or_default();
    let hotkey_str = settings.global_hotkey;

    // 2. อัปเดต state เอาไว้ให้รู้ว่าตอนนี้ใช้ปุ่มอะไรอยู่
    let state = app.state::<AppState>();
    *state.active_hotkey.lock().unwrap() = hotkey_str.clone();

    // 3. ลงทะเบียนปุ่มกับระบบ OS
    register_shortcut(&app, &hotkey_str);

    println!("[action-ring] Initial global hotkey registered: {}", hotkey_str);
    Ok(())
}

/// ฟังก์ชันสำหรับลงทะเบียนปุ่ม
/// ฟังก์ชันสำหรับลงทะเบียนปุ่ม
fn register_shortcut(app: &AppHandle, hotkey_str: &str) {
    let app_clone = app.clone();
    let _ = app.global_shortcut().on_shortcut(hotkey_str, move |app_handle, _shortcut, event| {
        if event.state() == ShortcutState::Pressed {
            // 💥 ตอนกดปุ่ม: โชว์วงแหวน
            if let Err(e) = window_manager::show_action_ring(&app_clone) {
                eprintln!("[action-ring] Failed to show ring: {e}");
            }
        } else if event.state() == ShortcutState::Released {
            // 💥 ตอนปล่อยปุ่ม: ส่งสัญญาณบอก React
            let _ = app_handle.emit("ring:key_released", ());
        }
    });
}
/// ถูกเรียกจาก `commands::save_settings` เวลาผู้ใช้กดเปลี่ยนปุ่มในหน้า UI
pub fn update_hotkey(app: &AppHandle, old_hotkey: &str, new_hotkey: &str) -> Result<(), String> {
    
    // 1. แปลงสตริงให้เป็นรูปแบบที่ plugin รู้จัก
    if let Ok(old_shortcut) = Shortcut::from_str(old_hotkey) {
        let _ = app.global_shortcut().unregister(old_shortcut);
        println!("[action-ring] Unregistered old hotkey: {}", old_hotkey);
    }

    // 2. ลงทะเบียนปุ่มใหม่
    register_shortcut(app, new_hotkey);
    println!("[action-ring] Successfully registered NEW hotkey: {}", new_hotkey);

    Ok(())
}