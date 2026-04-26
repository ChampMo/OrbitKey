//! Utilities for showing/hiding the Action Ring overlay window.
//!
//! ## Why Rust-side cursor polling instead of DOM mousemove?
//!
//! On macOS, a NonActivatingPanel that is NOT the active application can NEVER
//! reliably receive NSTrackingArea / mouseMoved events.  The window server
//! routes those only to the frontmost (active) app.  No AppKit trick fixes
//! this without stealing focus (which breaks fullscreen spaces).
//!
//! Solution: poll cursor position from Rust using CGEventGetLocation, which
//! works regardless of which app is active, and emit "ring:cursor" to React
//! every ~8 ms.  React drives all hover logic from these events instead of
//! DOM mousemove.

use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

#[derive(serde::Serialize, Clone)]
struct RingShowPayload {
    local_x: f64,
    local_y: f64,
}

#[derive(serde::Serialize, Clone)]
struct CursorPayload {
    local_x: f64,
    local_y: f64,
}

// Atomic flag: true while the ring is visible and polling should run.
static POLLING: AtomicBool = AtomicBool::new(false);

fn start_cursor_poll(app: AppHandle, monitor_x: f64, monitor_y: f64, scale: f64) {
    POLLING.store(true, Ordering::SeqCst);

    thread::spawn(move || {
        while POLLING.load(Ordering::SeqCst) {
            // CGEventGetLocation works even when our app is NOT focused —
            // this is the key property that makes it work on NonActivatingPanel.
            #[cfg(target_os = "macos")]
            {
                use core_graphics::event::CGEvent;
                use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

                if let Ok(src) = CGEventSource::new(CGEventSourceStateID::HIDSystemState) {
                    if let Ok(ev) = CGEvent::new(src) {
                        let loc = ev.location();
                        let local_x = (loc.x - monitor_x) / scale;
                        let local_y = (loc.y - monitor_y) / scale;
                        let _ = app.emit("ring:cursor", CursorPayload { local_x, local_y });
                    }
                }
            }

            thread::sleep(Duration::from_millis(8));
        }
    });
}

pub fn show_action_ring(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let ring_window = app
        .get_webview_window("action-ring")
        .ok_or("window not found")?;

    let cursor_pos = ring_window.cursor_position()?;
    let scale = ring_window.scale_factor().unwrap_or(1.0);

    let mut local_x = 400.0_f64;
    let mut local_y = 400.0_f64;
    let mut monitor_x = 0.0_f64;
    let mut monitor_y = 0.0_f64;

    if let Ok(Some(monitor)) = ring_window.current_monitor() {
        let mon_pos = monitor.position();
        let mon_size = monitor.size();
        let _ = ring_window.set_size(*mon_size);
        let _ = ring_window.set_position(*mon_pos);

        monitor_x = mon_pos.x as f64;
        monitor_y = mon_pos.y as f64;
        local_x = (cursor_pos.x as f64 - monitor_x) / scale;
        local_y = (cursor_pos.y as f64 - monitor_y) / scale;
    }

    let _ = ring_window.set_decorations(false);

    #[cfg(target_os = "macos")]
    {
        use objc::{msg_send, sel, sel_impl};
        use objc::runtime::{Object, YES};

        if let Ok(ns_win) = ring_window.ns_window() {
            let ns_window = ns_win as *mut Object;
            unsafe {
                // Show above fullscreen spaces without stealing focus from
                // the user's active app.  We intentionally do NOT call
                // makeKeyAndOrderFront here — that would steal the active space.
                let _: () = msg_send![ns_window, orderFrontRegardless];
                // Still needed so the webview can receive click/mousedown events.
                let _: () = msg_send![ns_window, setAcceptsMouseMovedEvents: YES];
            }
        }
    }

    let _ = ring_window.show();

    // Emit show event with initial cursor position.
    ring_window.emit("ring:show", RingShowPayload { local_x, local_y })?;

    // Start the polling thread that drives hover state in React.
    start_cursor_poll(app.clone(), monitor_x, monitor_y, scale);

    Ok(())
}

pub fn hide_action_ring(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    POLLING.store(false, Ordering::SeqCst);

    let ring_window = app
        .get_webview_window("action-ring")
        .ok_or("window not found")?;
    let _ = ring_window.emit("ring:hide", ());
    let _ = ring_window.hide();
    Ok(())
}