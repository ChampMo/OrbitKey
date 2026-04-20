//! Utilities for showing and hiding the Action Ring overlay window.

use tauri::{AppHandle, Emitter, Manager, PhysicalPosition};

const RING_WINDOW_LABEL: &str = "action-ring";
/// Logical size of the ring window in CSS pixels (must match tauri.conf.json)
const RING_WINDOW_SIZE: f64 = 450.0;

/// Show the Action Ring window centered on the current mouse cursor.
///
/// Steps:
/// 1. Query the global cursor position (physical pixels) via the ring window handle.
/// 2. Account for the DPI scale factor to compute physical window dimensions.
/// 3. Offset the window's top-left so the cursor sits exactly at the center.
/// 4. Reveal and focus the window, then emit `ring:show` for the React UI.
pub fn show_action_ring(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let ring_window = app
        .get_webview_window(RING_WINDOW_LABEL)
        .ok_or("action-ring window not found")?;

    // cursor_position() returns global screen coordinates in *physical* pixels.
    let cursor_pos = ring_window.cursor_position()?;

    // scale_factor() accounts for Hi-DPI (e.g., 2.0 on a Retina display).
    let scale = ring_window.scale_factor().unwrap_or(1.0);
    let physical_half = (RING_WINDOW_SIZE * scale) / 2.0;

    // Position the top-left corner so the center lands on the cursor.
    let x = (cursor_pos.x - physical_half) as i32;
    let y = (cursor_pos.y - physical_half) as i32;

    ring_window.set_position(PhysicalPosition::new(x, y))?;
    ring_window.show()?;
    ring_window.set_focus()?;

    // Tell the React UI to animate in. Payload is `null` (unit type).
    ring_window.emit("ring:show", ())?;

    println!(
        "[action-ring] Ring shown at physical ({}, {}), cursor at ({:.0}, {:.0})",
        x, y, cursor_pos.x, cursor_pos.y
    );
    Ok(())
}

/// Hide the Action Ring window.
pub fn hide_action_ring(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let ring_window = app
        .get_webview_window(RING_WINDOW_LABEL)
        .ok_or("action-ring window not found")?;

    // Notify React so it can play a dismiss animation before we hide.
    ring_window.emit("ring:hide", ())?;
    ring_window.hide()?;

    println!("[action-ring] Ring hidden.");
    Ok(())
}
