//! Utilities for showing and hiding the Action Ring overlay window.

use tauri::{AppHandle, Emitter, Manager};

const RING_WINDOW_LABEL: &str = "action-ring";
const RING_WINDOW_SIZE: f64 = 800.0;

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
    let physical_half = (RING_WINDOW_SIZE * scale) / 2.0;

    let target_x = (cursor_pos.x - physical_half) as i32;
    let target_y = (cursor_pos.y - physical_half) as i32;

    let _ = ring_window.set_position(tauri::PhysicalPosition::new(target_x, target_y));
    let _ = ring_window.show();

    // ❌ เอา ring_window.set_focus()?; ออกไปเลยครับ ห้ามใส่เด็ดขาด!

    // 🔥 เจาะระบบ macOS ให้เป็น "หน้าต่างผี" (ลอยอยู่แต่ไม่แย่ง Focus) เพื่อให้ Release Mode ทำงานได้
    #[cfg(target_os = "macos")]
    {
        let _ = ring_window.set_shadow(false);
        let ring_clone = ring_window.clone();

        let _ = app.run_on_main_thread(move || {
            if let Ok(ns_win_ptr) = ring_clone.ns_window() {
                use objc::{msg_send, sel, sel_impl};
                let ns_window = ns_win_ptr as *mut objc::runtime::Object;
                unsafe {
                    // 128 = Nonactivating Panel (สำคัญมาก: ไม่แย่ง Focus แอปอื่น)
                    let style_mask: usize = msg_send![ns_window, styleMask];
                    let _: () = msg_send![ns_window, setStyleMask: style_mask | 128];

                    // ทะลุ Fullscreen (1<<0 | 1<<4 | 1<<6 | 1<<8)
                    let behavior: usize = (1 << 0) | (1 << 4) | (1 << 6) | (1 << 8);
                    let _: () = msg_send![ns_window, setCollectionBehavior: behavior];

                    // ดันหน้าต่างไปเลเวลบนสุด
                    let level: isize = 2147483647;
                    let _: () = msg_send![ns_window, setLevel: level];

                    // บังคับรับเมาส์ Hover โดยไม่ต้องมี Focus
                    let accepts: i8 = 1;
                    let _: () = msg_send![ns_window, setAcceptsMouseMovedEvents: accepts];
                }
            }
        });
    }

    let _ = ring_window.set_decorations(false);

    let mut local_x = 400.0;
    let mut local_y = 400.0;

    if let Ok(actual_pos) = ring_window.outer_position() {
        local_x = (cursor_pos.x as f64 - actual_pos.x as f64) / scale;
        local_y = (cursor_pos.y as f64 - actual_pos.y as f64) / scale;
    }

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
