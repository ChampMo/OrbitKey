# 🎯 Action Ring

A radial menu desktop application — summon a beautiful action ring at your cursor with a global hotkey, then trigger keyboard shortcuts, launch apps, or run scripts with a single mouse gesture.

Inspired by [Kando](https://github.com/kando-menu/kando) and the Logitech Action Ring.

Built with **Tauri v2 · Rust · React · TypeScript · Tailwind CSS**.

---

## ✨ Features (Planned)

| Feature | Status |
|---|---|
| Global hotkey summons ring at cursor | ✅ Step 1 |
| Transparent, frameless overlay window | ✅ Step 1 |
| Two-window architecture (Control Panel + Ring) | ✅ Step 1 |
| SVG arc-based ring UI with mouse-angle tracking | 🔜 Step 2 |
| Keyboard shortcut simulation | 🔜 Step 3 |
| App launch & URL open | 🔜 Step 3 |
| Shell / Python script execution | 🔜 Step 3 |
| Profile persistence (JSON on disk) | 🔜 Step 4 |
| App-specific profiles (active window detection) | 🔜 Step 5 |
| Configurable hotkey from Control Panel | 🔜 Step 5 |
| System tray icon | 🔜 Step 6 |

---

## 🏗️ Architecture

```
action-ring/
├── src/                          # React + TypeScript frontend
│   ├── App.tsx                   # Window router (reads Tauri window label)
│   ├── index.css                 # Tailwind directives + transparent-bg rules
│   ├── main.tsx                  # React 18 entry point
│   └── windows/
│       ├── ControlPanel.tsx      # Settings / profile editor window
│       └── ActionRing.tsx        # Transparent overlay ring window
│
└── src-tauri/                    # Rust backend
    ├── src/
    │   ├── main.rs               # Binary entry (suppresses Windows console)
    │   ├── lib.rs                # Tauri builder: plugins, state, setup
    │   ├── state.rs              # Data models: Profile, ActionSlice, AppState
    │   ├── hotkey.rs             # Global hotkey registration (Alt+Q)
    │   ├── window_manager.rs     # Show/hide ring at cursor (DPI-aware)
    │   └── commands.rs           # Tauri invoke() commands for the frontend
    ├── capabilities/
    │   └── default.json          # Tauri v2 security permission grants
    └── tauri.conf.json           # App config: two windows, transparent ring
```

### Two-Window Design

Tauri creates **two separate WebviewWindow instances**, both loading the same `index.html`. The React app checks `getCurrentWebviewWindow().label` at startup and renders either `<ControlPanel>` or `<ActionRing>` — no URL routing needed.

| Window label | Type | Key properties |
|---|---|---|
| `main` | Control Panel | Standard decorated window, 1100×720 |
| `action-ring` | Ring overlay | Frameless, transparent, always-on-top, hidden by default |

### Global Hotkey Flow

```
User presses Alt+Q
        │
        ▼
tauri-plugin-global-shortcut (OS level)
        │
        ▼
hotkey.rs  →  window_manager::show_action_ring()
        │
        ├── ring_window.cursor_position()   ← global screen coords (physical px)
        ├── ring_window.scale_factor()      ← DPI compensation
        ├── ring_window.set_position(...)   ← center ring on cursor
        ├── ring_window.show()
        ├── ring_window.set_focus()
        └── ring_window.emit("ring:show")   ← triggers React animation
```

---

## 🚀 Prerequisites

Before you can run this project you need:

### 1. Rust toolchain

```sh
# Install rustup (the Rust version manager)
# Windows — download and run: https://win.rustup.rs
# macOS / Linux:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Make sure the stable toolchain is active
rustup default stable
rustup update
```

### 2. Tauri system dependencies

**Windows**
- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (select "Desktop development with C++")
- [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) — already present on Windows 10 21H2+ and Windows 11

**macOS**
```sh
xcode-select --install
```

**Linux (Debian/Ubuntu)**
```sh
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

### 3. Node.js ≥ 18

Download from [nodejs.org](https://nodejs.org) or use a version manager like `nvm`.

---

## 🛠️ Setup & Running

```sh
# 1. Clone / open the project directory
cd "Action Ring Project"

# 2. Install Node dependencies (already done if npm install was run)
npm install

# 3. Generate placeholder app icons (required before first build)
#    Provide any 1024×1024 PNG as the source:
npm run tauri icon path/to/your-icon.png
#    Or, to skip for now, Tauri dev mode will use a built-in fallback.

# 4. Start the development server (Vite + Tauri)
npm run tauri dev
```

> **First run** will take several minutes — Cargo is downloading and compiling
> ~200 Rust crates. Subsequent runs are much faster thanks to incremental compilation.

### Build for production

```sh
npm run tauri build
# Installer is output to: src-tauri/target/release/bundle/
```

---

## ⚙️ Key Configuration

### Change the summon hotkey

Edit `src-tauri/src/hotkey.rs`, line with `"Alt+Q"`:

```rust
handle.global_shortcut().on_shortcut("Ctrl+Shift+Space", ...)
```

Supported modifier names: `Ctrl`, `Alt`, `Shift`, `Super` (Win/Cmd key).
Supported key names: `Space`, `A`–`Z`, `F1`–`F12`, `Tab`, `Backspace`, etc.

### Change the ring window size

The ring is 450×450 logical pixels. This is set in **two** places that must stay in sync:

1. `src-tauri/tauri.conf.json` — `app.windows[1].width` / `.height`
2. `src-tauri/src/window_manager.rs` — `RING_WINDOW_SIZE` constant

### Tauri v2 Capabilities

Security permissions are in `src-tauri/capabilities/default.json`. If you add new Tauri plugins, add their permission strings there.

---

## 🗺️ Step-by-Step Build Roadmap

### Step 1 ✅ — Project Init & Rust Backend (current)
- Tauri v2 project scaffold with dual-window config
- Transparent, frameless `action-ring` overlay window
- `Alt+Q` global hotkey → `cursor_position()` → DPI-aware window placement
- Auto-hide on focus loss
- Tauri command stubs: `hide_action_ring`, `get_profiles`, `save_profile`, `delete_profile`, `execute_action`

### Step 2 — Action Ring UI & Mouse-Angle Math
- SVG-based ring rendered from `n` arc slices (configurable count)
- `atan2(dy, dx)` mouse tracking to highlight the hovered slice
- Smooth CSS transitions and glow effects
- Placeholder slices wired to `execute_action` invoke call

### Step 3 — Action Execution Engine (Rust)
- **Keyboard shortcuts**: `enigo` crate for cross-platform key simulation
- **App launch**: `tauri-plugin-shell` open command
- **Scripts**: spawn shell/Python subprocess, capture stdout/stderr

### Step 4 — Profile Persistence
- Serialize profiles to JSON in the Tauri app-data directory
- Load profiles on startup, auto-save on change
- Full CRUD UI in the Control Panel

### Step 5 — App-Specific Profiles
- Rust backend polls the active foreground window (WinAPI `GetForegroundWindow` / macOS `NSWorkspace`)
- Match process name against `profile.appMatcher`
- Emit `profile:changed` event to React when active profile switches

### Step 6 — Polish & Distribution
- System tray icon with "Open Control Panel" / "Quit" menu
- Configurable hotkey editor in the Control Panel
- Auto-start on login
- Code-signed installers for Windows (.msi) and macOS (.dmg)

---

## 🐛 Troubleshooting

| Problem | Solution |
|---|---|
| `Alt+Q` doesn't trigger the ring | Another app may have claimed that hotkey. Change it in `hotkey.rs`. |
| Ring window is not transparent | Ensure your GPU driver supports DWM composition (Windows) or Metal (macOS). |
| `cargo` not found | Restart your terminal after installing `rustup` so `~/.cargo/bin` is in PATH. |
| Build fails with missing icons | Run `npm run tauri icon <path-to-png>` to generate icon assets. |
| First Cargo build is very slow | Normal — Rust crates compile from source. Use `cargo build` to pre-warm the cache. |
| Ring appears on wrong monitor | Multi-monitor DPI handling is refined in Step 2. For now, physical px math is correct for single-monitor setups. |

---

## 📚 Tech References

- [Tauri v2 Docs](https://v2.tauri.app)
- [tauri-plugin-global-shortcut](https://github.com/tauri-apps/plugins-workspace/tree/v2/plugins/global-shortcut)
- [Tauri v2 Window Config](https://v2.tauri.app/reference/config/#windowconfig)
- [Tauri v2 Capabilities](https://v2.tauri.app/security/capabilities/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

## 📄 License

MIT
