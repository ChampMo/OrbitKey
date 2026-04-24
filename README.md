
<img src="./docs/icon.png" width="100">

# 🚀 OrbitKey

**High-speed Command Hub for Power Users.** *Summon a beautiful, adaptive radial menu at your cursor and execute macros with zero friction.*

[![Tauri v2](https://img.shields.io/badge/Tauri-v2-FFC131?logo=tauri&logoColor=white)](https://v2.tauri.app)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Rust](https://img.shields.io/badge/Rust-000000?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**OrbitKey** is a productivity-enhancing desktop application inspired by [Kando](https://github.com/kando-menu/kando) and the Logitech Action Ring. It allows you to run scripts, launch apps, or trigger keyboard shortcuts via a fluid radial menu.

---

## ✨ Key Highlights

* **⚡ Lightning Fast:** Built with Rust (Tauri v2) for minimal resource footprint and instant summoning via global hotkeys.
* **🎨 Adaptive Themes:** Features built-in themes (Cyber Dark, Neon Matrix, Peach Milk, etc.) that customize the entire application's aesthetic.
* **📂 Smart Folders:** Nested menu system with smooth "Expand/Collapse" spring animations for a clutter-free experience.
* **📐 Radial Precision:** Leverages directional vector math to ensure precise command selection via mouse angle (Wedge-based selection).
* **⚙️ Control Panel:** Easily manage profiles and commands through a beautifully designed, separate configuration window.
* **📦 Auto-Release:** Integrated GitHub Actions for automatic builds of installers (.exe, .dmg) upon version tagging.

---

## 🛠️ The "Secret Sauce" (Radial Math)

To achieve instinct-level speed, OrbitKey calculates 2D vectors from the center point:

1.  **Angle Calculation:** Converts mouse coordinates $(x, y)$ into angles using:
    $$\\theta = \\text{atan2}(\\Delta y, \\Delta x)$$
2.  **Selection Zone:** Divides the $360^\circ$ space into "Wedges" based on the number of slices. This allows selection via direction rather than precise icon clicking.
3.  **Deadzone Protection:** Prevents accidental triggers by checking Euclidean distance. If the movement is within $R_{dead}$, no action is taken:
    $$d = \\sqrt{(\\Delta x)^2 + (\\Delta y)^2}$$

---

## 🏗️ Project Architecture

```text
OrbitKey/
├── src/                  # 🎨 React + TS Frontend
│   ├── windows/          # Dual-window Views (Control Panel / Action Ring)
│   ├── Theme.tsx         # Master Theme Configuration
│   └── components/       # Reusable UI Components
└── src-tauri/            # 🦀 Rust Backend
    ├── src/
    │   ├── hotkey.rs     # Global Input Listener
    │   ├── commands.rs   # Bridge between JS and OS
    │   └── main.rs       # System Integration & Window Management
    └── tauri.conf.json   # App Metadata & Permissions
```
---

## 🗺️ Roadmap

[x] Phase 1: Project Foundation (Tauri v2 + Global Hotkey)

[x] Phase 2: Radial SVG UI and Theme System

[x] Phase 3: Folder Expansion & Spring Motion Animations

[x] Phase 4: Automated CI/CD via GitHub Actions

[ ] Phase 5: Auto-Switch Profile (Active Window Tracking)

[ ] Phase 6: Advanced Macro Recording (Sequential Input)

---

Created by ChampMo
