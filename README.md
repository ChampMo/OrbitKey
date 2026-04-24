# 🚀 OrbitKey

**High-speed Command Hub for Power Users.** *Summon a beautiful, adaptive radial menu at your cursor and execute macros with zero friction.*

[![Tauri v2](https://img.shields.io/badge/Tauri-v2-FFC131?logo=tauri&logoColor=white)](https://v2.tauri.app)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Rust](https://img.shields.io/badge/Rust-000000?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**OrbitKey** คือแอปพลิเคชันเพิ่มประสิทธิภาพการทำงาน (Productivity Tool) ที่ได้รับแรงบันดาลใจจาก [Kando](https://github.com/kando-menu/kando) และ Logitech Action Ring ช่วยให้คุณรัน Scripts, เปิดแอป หรือส่งคำสั่ง Keyboard Shortcut ผ่านเมนูวงแหวนที่ไหลลื่นที่สุด

---

## ✨ Key Highlights

* **⚡ Lightning Fast:** พัฒนาด้วย Rust (Tauri v2) กินทรัพยากรเครื่องน้อยมาก และเปิดขึ้นมาทันใจด้วย Global Hotkey
* **🎨 Adaptive Themes:** มาพร้อมระบบธีมในตัว (Cyber Dark, Neon Matrix, Peach Milk, etc.) ที่เปลี่ยนสีสันได้ทั้งแอป
* **📂 Smart Folders:** ระบบเมนูย่อยแบบ "หุบ-กาง" ที่ใช้ Spring Animation สมูทๆ ไม่รกสายตา
* **📐 Radial Precision:** ใช้คณิตศาสตร์วิถีโค้งเพื่อให้คุณเลือกคำสั่งได้แม่นยำผ่านทิศทางเมาส์ (Wedge-based selection)
* **⚙️ Control Panel:** จัดการโปรไฟล์และคำสั่งต่างๆ ได้ง่ายผ่านหน้าต่างแยกส่วนที่ออกแบบมาอย่างสวยงาม
* **📦 Auto-Release:** ระบบ GitHub Actions อัตโนมัติ Build ไฟล์ติดตั้ง (.exe, .dmg) ให้ทันทีเมื่อมีการติด Tag เวอร์ชัน

---

## 🛠️ The "Secret Sauce" (Radial Math)

เพื่อให้การเลือกคำสั่งรวดเร็วระดับสัญชาตญาณ OrbitKey ใช้การคำนวณเวกเตอร์ 2 มิติจากจุดศูนย์กลาง:

1.  **Angle Calculation:** แปลงพิกัดเมาส์ $(x, y)$ เป็นองศาโดยใช้:
    $$\theta = \text{atan2}(\Delta y, \Delta x)$$
2.  **Selection Zone:** แบ่งพื้นที่วงกลมเป็นส่วนๆ (Wedges) ตามจำนวนคำสั่ง ทำให้ไม่ต้องเล็งคลิกที่ไอคอน แต่สะบัดเมาส์ไปตามทิศทางก็เลือกได้ทันที
3.  **Deadzone Protection:** ป้องกันการลั่นด้วยการเช็คระยะห่าง (Euclidean distance) ถ้าเมาส์ขยับไม่เกิน $R_{dead}$ จะไม่ทำงาน:
    $$d = \sqrt{(\Delta x)^2 + (\Delta y)^2}$$

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
[x] Phase 1: ระบบพื้นฐาน Tauri v2 + Global Hotkey

[x] Phase 2: เมนูวงแหวน SVG และระบบ Theme

[x] Phase 3: แอนิเมชัน Folder หุบ-กาง และ Spring Motion

[x] Phase 4: ระบบ Build อัตโนมัติผ่าน GitHub Actions

[ ] Phase 5: ระบบ "Auto-Switch Profile" ตามแอปที่เปิดอยู่ (Active Window Tracking)

[ ] Phase 6: ระบบ "Macro Recording" บันทึกการกดปุ่มแบบลำดับชั้น

---

Created by ChampMo
