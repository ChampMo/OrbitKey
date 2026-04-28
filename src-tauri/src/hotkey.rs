use std::str::FromStr;
use tauri::AppHandle;
use tauri::Emitter;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

use crate::{state::AppState, storage, window_manager};
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

    println!(
        "[action-ring] Initial global hotkey registered: {}",
        hotkey_str
    );
    Ok(())
}

/// ฟังก์ชันสำหรับลงทะเบียนปุ่ม
fn register_shortcut(app: &AppHandle, hotkey_str: &str) {
    let app_clone = app.clone();
    let _ = app
        .global_shortcut()
        .on_shortcut(hotkey_str, move |app_handle, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                
                // 💥 [เพิ่มใหม่] สำหรับ Windows: สั่งให้หน้าต่างวาร์ปไปหาเมาส์ก่อนโชว์
                if let Some(window) = app_clone.get_webview_window("action-ring") {
                    #[cfg(target_os = "windows")]
                    {
                        if let Ok(cursor_pos) = window.cursor_position() {
                            // หักลบครึ่งนึงของขนาดหน้าต่าง (800/2 = 400) เพื่อให้เมาส์อยู่ตรงกลางเป๊ะ
                            let x = cursor_pos.x as i32 - 400;
                            let y = cursor_pos.y as i32 - 400;
                            let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }));
                        }
                    }
                }

                // 💥 ตอนกดปุ่ม: โชว์วงแหวน (เรียกฟังก์ชันเดิมของแชมป์)
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
    println!(
        "[action-ring] Successfully registered NEW hotkey: {}",
        new_hotkey
    );

    Ok(())
}