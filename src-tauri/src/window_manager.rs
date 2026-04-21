//! Utilities for showing and hiding the Action Ring overlay window.

use tauri::{AppHandle, Emitter, LogicalSize, Manager, PhysicalPosition};

const RING_WINDOW_LABEL: &str = "action-ring";

/// **แก้ไขจุดที่ 1:** ปรับขนาดให้ตรงกับ tauri.conf.json (800.0)
/// เพื่อให้การคำนวณจุดกึ่งกลาง (Physical Half) ถูกต้อง
const RING_WINDOW_SIZE: f64 = 800.0;

/// Show the Action Ring window centered on the current mouse cursor.
pub fn show_action_ring(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let ring_window = app
        .get_webview_window(RING_WINDOW_LABEL)
        .ok_or("action-ring window not found")?;

    // ปรับแต่ง Window พื้นฐาน
    #[cfg(target_os = "macos")]
    {
        let _ = ring_window.set_shadow(false);
    }
    let _ = ring_window.set_decorations(false);

    // **แก้ไขจุดที่ 2:** ดึงตำแหน่งเม้าส์ปัจจุบัน
    // หมายเหตุ: cursor_position() ของ Tauri ให้พิกัดแบบ Physical มาอยู่แล้ว
    let cursor_pos = ring_window.cursor_position()?;

    // คำนวณหาจุดกึ่งกลางหน้าต่างโดยอิงจาก Scale Factor (DPI) ของจอ
    let scale = ring_window.scale_factor().unwrap_or(1.0);
    let physical_half = (RING_WINDOW_SIZE * scale) / 2.0;

    // คำนวณพิกัด Top-Left ใหม่ เพื่อให้จุด Center (400, 400) ตรงกับเม้าส์
    let x = (cursor_pos.x - physical_half) as i32;
    let y = (cursor_pos.y - physical_half) as i32;

    // สั่งย้ายหน้าต่างไปที่ตำแหน่งเมาส์ "ก่อน" ที่จะโชว์
    ring_window.set_position(PhysicalPosition::new(x, y))?;

    // บังคับขนาดให้ชัวร์ว่าเป็น 800x800 (ป้องกันอาการจอล้น)
    let _ = ring_window.set_size(tauri::Size::Logical(LogicalSize::new(
        RING_WINDOW_SIZE,
        RING_WINDOW_SIZE,
    )));

    // โชว์และดึง Focus
    ring_window.show()?;
    ring_window.set_focus()?;

    // ส่ง Event ไปบอก React ให้เริ่มวาดวงแหวน
    ring_window.emit("ring:show", ())?;

    Ok(())
}

/// Hide the Action Ring window.
pub fn hide_action_ring(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let ring_window = app
        .get_webview_window(RING_WINDOW_LABEL)
        .ok_or("action-ring window not found")?;

    ring_window.emit("ring:hide", ())?;
    ring_window.hide()?;

    println!("[action-ring] Ring hidden.");
    Ok(())
}
