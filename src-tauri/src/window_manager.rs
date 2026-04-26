//! Utilities for showing and hiding the Action Ring overlay window.

use tauri::{AppHandle, Emitter, Manager};

#[derive(serde::Serialize, Clone)]
struct RingShowPayload {
    local_x: f64,
    local_y: f64,
}

pub fn show_action_ring(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let ring_window = app
        .get_webview_window("action-ring")
        .ok_or("window not found")?;

    let cursor_pos = ring_window.cursor_position()?;
    let scale = ring_window.scale_factor().unwrap_or(1.0);

    let mut local_x = 400.0;
    let mut local_y = 400.0;

    if let Ok(Some(monitor)) = ring_window.current_monitor() {
        let mon_pos = monitor.position();
        let mon_size = monitor.size();
        let _ = ring_window.set_size(*mon_size);
        let _ = ring_window.set_position(*mon_pos);

        local_x = (cursor_pos.x as f64 - mon_pos.x as f64) / scale;
        local_y = (cursor_pos.y as f64 - mon_pos.y as f64) / scale;
    }

    let _ = ring_window.set_decorations(false);

    // โชว์หน้าต่างของ Tauri เพื่อให้ Webview อัปเดตสถานะ
    let _ = ring_window.show();

    // 🍎 ท่าไม้ตายก้นหีบของ Mac Dev (ดึง Focus เมาส์โดยไม่กระชากจอ)
    #[cfg(target_os = "macos")]
    {
        if let Ok(ns_win) = ring_window.ns_window() {
            use objc::{msg_send, sel, sel_impl};
            unsafe {
                let ns_window = ns_win as *mut objc::runtime::Object;
                let nil_id: *mut objc::runtime::Object = std::ptr::null_mut();

                // 💥 1. สั่งให้โชว์และ "รับบทเป็นหน้าต่าง Key" ทันที
                // ท่านี้แหละที่แก้ปัญหา Hover ไม่ติดและต้องคลิกค้าง!
                let _: () = msg_send![ns_window, makeKeyAndOrderFront: nil_id];

                // 💥 2. บังคับรับเมาส์ Hover เสมอ
                let _: () = msg_send![ns_window, setAcceptsMouseMovedEvents: true];

                // 💥 3. ป้องกัน Tauri บล็อกการรับคลิกเพราะมองว่าเป็นหน้าต่างโปร่งใส
                let _: () = msg_send![ns_window, setIgnoresMouseEvents: false];
            }
        }
    }

    // ❌ ห้ามใช้ ring_window.set_focus() ของ Tauri เด็ดขาด!

    ring_window.emit("ring:show", RingShowPayload { local_x, local_y })?;

    Ok(())
}

pub fn hide_action_ring(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let ring_window = app
        .get_webview_window("action-ring")
        .ok_or("window not found")?;
    let _ = ring_window.emit("ring:hide", ());
    let _ = ring_window.hide();
    Ok(())
}
