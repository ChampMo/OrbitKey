//! Utilities for showing and hiding the Action Ring overlay window.

use tauri::{AppHandle, Emitter, LogicalSize, Manager, PhysicalPosition};

const RING_WINDOW_LABEL: &str = "action-ring";

/// **แก้ไขจุดที่ 1:** ปรับขนาดให้ตรงกับ tauri.conf.json (800.0)
/// เพื่อให้การคำนวณจุดกึ่งกลาง (Physical Half) ถูกต้อง
const RING_WINDOW_SIZE: f64 = 800.0;

/// Show the Action Ring window centered on the current mouse cursor.
// เพิ่ม Struct นี้ไว้ด้านบนของฟังก์ชัน
// อย่าลืมเอา Struct นี้ไว้ด้านบนของฟังก์ชันเหมือนเดิมนะคับ
// ใส่ไว้ด้านบนสุดของฟังก์ชันเหมือนเดิมครับ
#[derive(serde::Serialize, Clone)]
struct RingShowPayload {
    local_x: f64,
    local_y: f64,
}

pub fn show_action_ring(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let ring_window = app.get_webview_window("action-ring").ok_or("window not found")?;

    #[cfg(target_os = "macos")]
    {
        let _ = ring_window.set_shadow(false);
        use objc::{msg_send, sel, sel_impl};
        let ns_window = ring_window.ns_window().unwrap() as *mut objc::runtime::Object;
        unsafe {
            // (1<<0) AllSpaces | (1<<4) Stationary | (1<<6) IgnoresCycle | (1<<8) FullScreenAux
            let behavior: u64 = (1 << 0) | (1 << 4) | (1 << 6) | (1 << 8);
            let _: () = msg_send![ns_window, setCollectionBehavior: behavior];
            let style_mask: u64 = msg_send![ns_window, styleMask];
            let _: () = msg_send![ns_window, setStyleMask: style_mask | 128]; // Non-activating
            
            let level: i64 = 2147483647; // Max Level
            let _: () = msg_send![ns_window, setLevel: level];
        }
    }
    let _ = ring_window.set_decorations(false);

    // 1. ดึงตำแหน่งเมาส์และตั้งศูนย์กลาง
    let cursor_pos = ring_window.cursor_position()?;
    let scale = ring_window.scale_factor().unwrap_or(1.0);
    let physical_half = (800.0 * scale) / 2.0;

    let target_x = (cursor_pos.x - physical_half) as i32;
    let target_y = (cursor_pos.y - physical_half) as i32;

    let _ = ring_window.set_position(tauri::PhysicalPosition::new(target_x, target_y));
    let _ = ring_window.show();
    ring_window.set_focus()?;

    
    let mut local_x = 400.0;
    let mut local_y = 400.0;

    if let Ok(actual_pos) = ring_window.outer_position() {
        local_x = (cursor_pos.x as f64 - actual_pos.x as f64) / scale;
        local_y = (cursor_pos.y as f64 - actual_pos.y as f64) / scale;
    }

    ring_window.emit("ring:show", RingShowPayload { local_x, local_y })?;

    Ok(())
}

pub fn hide_action_ring(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let ring_window = app.get_webview_window("action-ring").ok_or("window not found")?;
    let _ = ring_window.emit("ring:hide", ());
    let _ = ring_window.hide();



    Ok(())
}