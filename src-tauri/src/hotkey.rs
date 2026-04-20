//! Global hotkey registration.
//!
//! In Step 1 the summon shortcut (Alt+Q) is hard-coded.
//! Future steps will make it configurable from the Control Panel.

use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::window_manager;

/// Register all global shortcuts with the OS.
///
/// Called once during Tauri's `.setup()` phase.
pub fn setup_hotkeys(handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let app = handle.clone();

    // Alt+Q — summon / dismiss the Action Ring
    handle
        .global_shortcut()
        .on_shortcut("Alt+Q", move |_handle, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                if let Err(e) = window_manager::show_action_ring(&app) {
                    eprintln!("[action-ring] Failed to show ring: {e}");
                }
            }
        })?;

    println!("[action-ring] Global hotkey registered: Alt+Q");
    Ok(())
}
