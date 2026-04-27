//! Action execution engine.
//!
//! Three dispatch paths, each called from an async Tauri command via
//! `tokio::task::spawn_blocking` so they never block the async executor:
//!
//! | Function              | What it does                                        |
//! |-----------------------|-----------------------------------------------------|
//! | [`simulate_shortcut`] | Parse a shortcut string and replay it via `enigo`   |
//! | [`launch_target`]     | Open a URL, file, or executable via the OS          |
//! | [`run_script`]        | Spawn an interpreter sub-process, capture output    |

use std::{process::Command, time::Duration};

use enigo::{Direction, Enigo, Key, Keyboard, Settings};

// ─── Shortcut simulation ──────────────────────────────────────────────────────

/// Parse and simulate a keyboard shortcut string.
///
/// ## Format
///
/// Modifier tokens joined with `+`, main key last.
/// Case-insensitive; whitespace around `+` is allowed.
///
/// ```text
/// "ctrl+c"            copy
/// "ctrl+shift+s"      save-as in many apps
/// "cmd+space"         macOS Spotlight
/// "alt+f4"            close window (Windows)
/// "ctrl+alt+delete"   Windows Task Manager
/// ```
///
/// ## Recognised modifiers
///
/// `ctrl` / `control`, `shift`, `alt` / `option`,
/// `cmd` / `command` / `meta` / `win` / `super`
///
/// ## Recognised main keys
///
/// * Single ASCII characters: `a`–`z`, `0`–`9`, common punctuation
/// * Special: `space`, `enter`/`return`, `tab`, `backspace`, `delete`,
///   `escape`/`esc`, `insert`
/// * Navigation: `up`, `down`, `left`, `right`, `home`, `end`,
///   `pageup`/`pgup`, `pagedown`/`pgdn`
/// * Function: `f1`–`f12`
///
/// ## Platform notes
///
/// * **macOS** — the app must have *Accessibility* permission granted in
///   *System Preferences → Privacy & Security → Accessibility*, otherwise
///   `Enigo::new` will return an error.
/// * **Windows** — no extra permissions required in a normal desktop session.
// ─── Shortcut simulation ──────────────────────────────────────────────────────

pub fn simulate_shortcut(shortcut: &str) -> Result<(), String> {
    let lower = shortcut.to_lowercase();
    let tokens: Vec<&str> = lower
        .split('+')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .collect();

    if tokens.is_empty() {
        return Err(format!("Empty shortcut string: {:?}", shortcut));
    }

    let (mod_tokens, key_tokens) = tokens.split_at(tokens.len() - 1);
    let key_str = key_tokens[0];

    // 🍎 ท่าเจาะเกราะ macOS: ใช้ AppleScript ยิงคำสั่งแทน enigo (ไม่มีวันแครช 100%)
    // 🍎 ท่าเจาะเกราะ macOS: ใช้ AppleScript ยิงคำสั่งแทน enigo (ไม่มีวันแครช 100%)
    #[cfg(target_os = "macos")]
    {
        // 💥 1. หน่วงเวลาให้วงแหวนปิดสนิท และแอปเดิมดึง Focus กลับไปก่อน (สำคัญมาก!)
        std::thread::sleep(std::time::Duration::from_millis(100));

        let mut modifiers = Vec::new();
        for &m in mod_tokens {
            match m {
                "cmd" | "command" | "meta" | "win" | "super" => modifiers.push("command down"),
                "ctrl" | "control" => modifiers.push("control down"),
                "shift" => modifiers.push("shift down"),
                "alt" | "option" => modifiers.push("option down"),
                _ => {}
            }
        }

        let using_clause = if modifiers.is_empty() {
            String::new()
        } else {
            format!("using {{{}}}", modifiers.join(", "))
        };

        // 💥 2. แปลงตัวอักษรเป็น Hardware Key Code ของ Mac (เพื่อทะลุกำแพงภาษาไทย)
        let key_code = match key_str {
            "a" => 0,
            "s" => 1,
            "d" => 2,
            "f" => 3,
            "h" => 4,
            "g" => 5,
            "z" => 6,
            "x" => 7,
            "c" => 8,
            "v" => 9,
            "b" => 11,
            "q" => 12,
            "w" => 13,
            "e" => 14,
            "r" => 15,
            "y" => 16,
            "t" => 17,
            "1" => 18,
            "2" => 19,
            "3" => 20,
            "4" => 21,
            "6" => 22,
            "5" => 23,
            "=" => 24,
            "9" => 25,
            "7" => 26,
            "-" => 27,
            "8" => 28,
            "0" => 29,
            "]" => 30,
            "o" => 31,
            "u" => 32,
            "[" => 33,
            "i" => 34,
            "p" => 35,
            "l" => 37,
            "j" => 38,
            "'" => 39,
            "k" => 40,
            ";" => 41,
            "\\" => 42,
            "," => 43,
            "/" => 44,
            "n" => 45,
            "m" => 46,
            "." => 47,
            "return" | "enter" => 36,
            "tab" => 48,
            "space" | " " => 49,
            "delete" | "backspace" | "bksp" => 51,
            "esc" | "escape" => 53,
            "up" | "uparrow" => 126,
            "down" | "downarrow" => 125,
            "left" | "leftarrow" => 123,
            "right" | "rightarrow" => 124,
            _ => -1, // ถ้าไม่อยู่ในลิสต์ ให้ข้ามไปใช้ keystroke ปกติ
        };

        let script = if key_code != -1 {
            // ใช้รหัสฮาร์ดแวร์ (ปลอดภัยที่สุด) 
            format!(
                "tell application \"System Events\" to key code {} {}",
                key_code, using_clause
            )
        } else {
            // สำรองสำหรับปุ่มที่ไม่ได้ map ไว้
            format!(
                "tell application \"System Events\" to keystroke \"{}\" {}",
                key_str, using_clause
            )
        };

        // สั่งรัน AppleScript
        let output = std::process::Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .output()
            .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;

        if !output.status.success() {
            return Err("Need Accessibility Permission! (macOS blocked this action)".to_string());
        }

        println!(
            "[action-ring] Shortcut simulated via AppleScript: {}",
            shortcut
        );
        return Ok(());
    }

    // 🪟 สำหรับ Windows / Linux ยังคงใช้ enigo ตามปกติ (เพราะระบบมันไม่โหดเท่า Mac)
    #[cfg(target_os = "windows")]
    {
        // 💥 หน่วงเวลา 150ms ให้วงแหวนปิดตัวลง และคืน Focus ให้แอปเป้าหมายก่อน
        std::thread::sleep(std::time::Duration::from_millis(150));

        // นำเข้าคำสั่งระดับลึกของ Windows
        extern "system" {
            fn keybd_event(bVk: u8, bScan: u8, dwFlags: u32, dwExtraInfo: usize);
        }
        const KEYEVENTF_KEYUP: u32 = 0x0002;

        let mut vk_modifiers = Vec::new();
        for &m in mod_tokens {
            match m {
                "cmd" | "command" | "meta" | "win" | "super" => vk_modifiers.push(0x5B), // ปุ่ม Windows
                "ctrl" | "control" => vk_modifiers.push(0x11), // ปุ่ม Control
                "shift" => vk_modifiers.push(0x10), // ปุ่ม Shift
                "alt" | "option" => vk_modifiers.push(0x12), // ปุ่ม Alt
                _ => {}
            }
        }

        // แปลงตัวอักษรเป็นรหัส Hardware Keyboard
        let vk_key = match key_str {
            "a" => 0x41, "b" => 0x42, "c" => 0x43, "d" => 0x44, "e" => 0x45, "f" => 0x46, 
            "g" => 0x47, "h" => 0x48, "i" => 0x49, "j" => 0x4A, "k" => 0x4B, "l" => 0x4C, 
            "m" => 0x4D, "n" => 0x4E, "o" => 0x4F, "p" => 0x50, "q" => 0x51, "r" => 0x52, 
            "s" => 0x53, "t" => 0x54, "u" => 0x55, "v" => 0x56, "w" => 0x57, "x" => 0x58, 
            "y" => 0x59, "z" => 0x5A,
            "0" => 0x30, "1" => 0x31, "2" => 0x32, "3" => 0x33, "4" => 0x34, 
            "5" => 0x35, "6" => 0x36, "7" => 0x37, "8" => 0x38, "9" => 0x39,
            "space" | " " => 0x20, "enter" | "return" => 0x0D, "tab" => 0x09, 
            "escape" | "esc" => 0x1B, "delete" | "del" => 0x2E, "backspace" | "bksp" => 0x08, 
            "up" => 0x26, "down" => 0x28, "left" => 0x25, "right" => 0x27,
            "-" => 0xBD, "=" => 0xBB, "[" => 0xDB, "]" => 0xDD, "\\" => 0xDC, 
            ";" => 0xBA, "'" => 0xDE, "," => 0xBC, "." => 0xBE, "/" => 0xBF,
            _ => 0,
        };

        unsafe {
            // กดปุ่มเสริมค้างไว้
            for &vk in &vk_modifiers {
                keybd_event(vk, 0, 0, 0);
            }
            
            std::thread::sleep(std::time::Duration::from_millis(20));

            // กดปุ่มหลักแล้วปล่อย
            if vk_key != 0 {
                keybd_event(vk_key, 0, 0, 0);
                keybd_event(vk_key, 0, KEYEVENTF_KEYUP, 0);
            }

            // ปล่อยปุ่มเสริม (ต้องถอยหลัง)
            for &vk in vk_modifiers.iter().rev() {
                keybd_event(vk, 0, KEYEVENTF_KEYUP, 0);
            }
        }

        println!("[action-ring] Shortcut simulated via Native Windows API: {}", shortcut);
        return Ok(());
    }

    // 🐧 สำหรับ Linux ให้คง enigo ไว้
    #[cfg(target_os = "linux")]
    {
        use enigo::{Direction, Enigo, Key, Keyboard, Settings};
        let modifiers: Vec<Key> = mod_tokens.iter().map(|s| parse_modifier(s)).collect::<Result<_, _>>()?;
        let main_key = parse_key(key_str)?;
        let mut enigo = Enigo::new(&Settings::default()).map_err(|e| format!("Failed to initialise: {e}"))?;

        for &modifier in &modifiers { let _ = enigo.key(modifier, Direction::Press); }
        std::thread::sleep(std::time::Duration::from_millis(20));
        let mut is_success = true;
        let mut error_message = String::new();
        if let Err(e) = enigo.key(main_key, Direction::Click) {
            is_success = false;
            error_message = format!("Key click failed ({key_str:?}): {e}");
        }
        for &modifier in modifiers.iter().rev() { let _ = enigo.key(modifier, Direction::Release); }
        if !is_success { return Err(error_message); }
        return Ok(());
    }
}

/// Map a lowercase modifier token to an [`enigo::Key`].
fn parse_modifier(s: &str) -> Result<Key, String> {
    match s {
        // 💥 ลบเงื่อนไขที่แอบแปลงเป็น Control ออกไป ให้ทุก OS ใช้ปุ่ม Meta ตรงๆ
        "cmd" | "command" | "meta" | "win" | "super" => Ok(Key::Meta),
        "ctrl" | "control" => Ok(Key::Control),
        "shift" => Ok(Key::Shift),
        "alt" | "option" => Ok(Key::Alt),
        _ => Err(format!("Unknown modifier: {}", s)),
    }
}

/// Map a lowercase key token to an [`enigo::Key`].
fn parse_key(s: &str) -> Result<Key, String> {
    match s {
        // ── Whitespace / control ──────────────────────────────────────────
        "space" | " " => Ok(Key::Space),
        "enter" | "return" => Ok(Key::Return),
        "tab" => Ok(Key::Tab),
        "backspace" | "bksp" => Ok(Key::Backspace),
        "delete" | "del" => Ok(Key::Delete),
        "escape" | "esc" => Ok(Key::Escape),
        "insert" | "ins" => Ok(Key::Home),
        // ── Arrow keys ────────────────────────────────────────────────────
        "up" | "uparrow" => Ok(Key::UpArrow),
        "down" | "downarrow" => Ok(Key::DownArrow),
        "left" | "leftarrow" => Ok(Key::LeftArrow),
        "right" | "rightarrow" => Ok(Key::RightArrow),
        // ── Page / navigation ─────────────────────────────────────────────
        "home" => Ok(Key::Home),
        "end" => Ok(Key::End),
        "pageup" | "pgup" | "page_up" => Ok(Key::PageUp),
        "pagedown" | "pgdn" | "pgdown" | "page_down" => Ok(Key::PageDown),
        // ── Function keys ─────────────────────────────────────────────────
        "f1" => Ok(Key::F1),
        "f2" => Ok(Key::F2),
        "f3" => Ok(Key::F3),
        "f4" => Ok(Key::F4),
        "f5" => Ok(Key::F5),
        "f6" => Ok(Key::F6),
        "f7" => Ok(Key::F7),
        "f8" => Ok(Key::F8),
        "f9" => Ok(Key::F9),
        "f10" => Ok(Key::F10),
        "f11" => Ok(Key::F11),
        "f12" => Ok(Key::F12),
        // ── Single character ──────────────────────────────────────────────
        other => {
            let mut chars = other.chars();
            match (chars.next(), chars.next()) {
                (Some(c), None) => Ok(Key::Unicode(c)),
                _ => Err(format!("Unknown key: {other:?}")),
            }
        }
    }
}
// ─── Launch ───────────────────────────────────────────────────────────────────

/// Open a URL, document, or executable in a fire-and-forget detached process.
///
/// ## Routing logic
///
/// | Target prefix          | Action                                        |
/// |------------------------|-----------------------------------------------|
/// | `http://`, `https://`  | OS default browser                            |
/// | `mailto:`              | OS default mail client                        |
/// | `file://`              | OS default app for that file                  |
/// | *(anything else)*      | Treated as an executable path, spawned directly |
///
/// ## Platform open helpers (for URL / protocol targets)
///
/// * macOS   → `open <target>`
/// * Windows → `cmd /c start "" "<target>"`  (+ `CREATE_NO_WINDOW` flag)
/// * Linux   → `xdg-open <target>`
pub fn launch_target(target: &str) -> Result<(), String> {
    let trimmed = target.trim();

    if trimmed.is_empty() {
        return Err("Launch target is empty".to_string());
    }

    let is_protocol = ["http://", "https://", "mailto:", "file://"]
        .iter()
        .any(|p| trimmed.starts_with(p));

    if is_protocol {
        open_with_default_app(trimmed)?;
    } else {
        // --- แก้ไขจุดนี้ครับ ---
        #[cfg(target_os = "windows")]
        {
            let mut cmd = Command::new("cmd");
            cmd.args(["/c", "start", "", trimmed]);
            spawn_detached(cmd).map_err(|e| format!("Failed to launch {trimmed}: {e}"))?;
        }

        #[cfg(not(target_os = "windows"))]
        {
            let cmd = Command::new(trimmed);
            spawn_detached(cmd).map_err(|e| format!("Failed to launch {trimmed}: {e}"))?;
        }
    }

    println!("[action-ring] Launched: {trimmed}");
    Ok(())
}

/// Open a URL or file using the OS-level default-application handler.
fn open_with_default_app(target: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let mut cmd = Command::new("open");
        cmd.arg(target);
        spawn_detached(cmd).map_err(|e| format!("macOS `open` failed for {target:?}: {e}"))?;
    }

    #[cfg(target_os = "windows")]
    {
        // `start "" "<target>"` — the empty string is the required window-title
        // argument. Each token is a separate arg so no shell quoting is needed.
        let mut cmd = Command::new("cmd");
        cmd.args(["/c", "start", "", target]);
        spawn_detached(cmd).map_err(|e| format!("Windows `start` failed for {target:?}: {e}"))?;
    }

    #[cfg(target_os = "linux")]
    {
        spawn_detached(Command::new("xdg-open").arg(target))
            .map_err(|e| format!("`xdg-open` failed for {target:?}: {e}"))?;
    }

    Ok(())
}

/// Spawn `cmd` in a detached, background process.
///
/// On Windows, the `CREATE_NO_WINDOW` creation flag (0x0800_0000) prevents
/// a console window from briefly flashing when the Action Ring calls `start`
/// or any other console-based launcher from a GUI-subsystem binary.
fn spawn_detached(mut cmd: Command) -> std::io::Result<()> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd.spawn()?;
    Ok(())
}

// ─── Script execution ─────────────────────────────────────────────────────────

/// Execute a script file, auto-detecting the interpreter from the extension.
///
/// Runs **synchronously** (blocks until the process exits). Always call this
/// from `tokio::task::spawn_blocking` to avoid stalling the async executor.
///
/// Returns the combined stdout (and stderr, if non-empty) as a `String`.
///
/// ## Interpreter selection (by file extension)
///
/// | Extension          | Interpreter                                         |
/// |--------------------|-----------------------------------------------------|
/// | `.py`              | `python3` (macOS / Linux)  ·  `python` (Windows)   |
/// | `.sh`, `.bash`     | `bash`                                              |
/// | `.zsh`             | `zsh`                                               |
/// | `.ps1`             | `powershell -ExecutionPolicy Bypass -File`          |
/// | `.js`, `.mjs`      | `node`                                              |
/// | `.rb`              | `ruby`                                              |
/// | `.lua`             | `lua`                                               |
/// | *(none / other)*   | Execute the path directly (binary / shebang line)   |
///
/// `extra_args` are appended after the script path in the interpreter call.
pub fn run_script(script_path: &str, extra_args: &[String]) -> Result<String, String> {
    use std::path::Path;

    let path = script_path.trim();

    if path.is_empty() {
        return Err("Script path is empty".to_string());
    }

    let ext = Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let (interpreter, base_args) = choose_interpreter(&ext, path);

    // Build the command
    let mut cmd = Command::new(&interpreter);
    cmd.args(&base_args);
    if !extra_args.is_empty() {
        cmd.args(extra_args);
    }

    // Suppress console window on Windows (we capture output anyway)
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    // Run synchronously, capture all output
    let output = cmd
        .output()
        .map_err(|e| format!("Failed to run {path:?} via {interpreter:?}: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
    let stderr = String::from_utf8_lossy(&output.stderr).into_owned();

    // Combine for the return value
    let combined = match (stdout.trim().is_empty(), stderr.trim().is_empty()) {
        (false, false) => format!("{stdout}\n─── stderr ───\n{stderr}"),
        (false, true) => stdout,
        (true, false) => format!("─── stderr ───\n{stderr}"),
        (true, true) => String::new(),
    };

    // Log result
    if output.status.success() {
        println!(
            "[action-ring] Script {path:?} exited 0{}",
            if combined.is_empty() {
                String::new()
            } else {
                format!(":\n{combined}")
            }
        );
    } else {
        let code = output.status.code().unwrap_or(-1);
        eprintln!(
            "[action-ring] Script {path:?} exited {code}{}",
            if combined.is_empty() {
                String::new()
            } else {
                format!(":\n{combined}")
            }
        );
    }

    Ok(combined)
}

/// Return `(interpreter_binary, args_before_script_path)` for a given extension.
///
/// For most interpreters, `base_args` is just `[path]`.
/// For direct execution (unknown extension), the path IS the interpreter
/// and `base_args` is empty.
fn choose_interpreter(ext: &str, path: &str) -> (String, Vec<String>) {
    match ext {
        "py" => {
            // Windows ships `python`; most Unix distros ship `python3`
            let interp = if cfg!(target_os = "windows") {
                "python"
            } else {
                "python3"
            };
            (interp.to_string(), vec![path.to_string()])
        }
        "sh" | "bash" => ("bash".to_string(), vec![path.to_string()]),
        "zsh" => ("zsh".to_string(), vec![path.to_string()]),
        "ps1" => (
            "powershell".to_string(),
            vec![
                "-ExecutionPolicy".to_string(),
                "Bypass".to_string(),
                "-File".to_string(),
                path.to_string(),
            ],
        ),
        "js" | "mjs" | "cjs" => ("node".to_string(), vec![path.to_string()]),
        "rb" => ("ruby".to_string(), vec![path.to_string()]),
        "lua" => ("lua".to_string(), vec![path.to_string()]),
        // No recognised extension — execute directly (binary or shebang script)
        _ => (path.to_string(), vec![]),
    }
}

/// แปลงตัวอักษรแป้นพิมพ์อังกฤษ เป็นตัวอักษรภาษาไทย (เกษมณี)
/// เพื่อใช้หลอก OS ให้หาปุ่มกดเจอเวลาผู้ใช้ลืมเปลี่ยนภาษา
fn eng_to_thai_kedmanee(c: char) -> char {
    match c.to_ascii_lowercase() {
        'a' => 'ฟ',
        'b' => 'ิ',
        'c' => 'แ',
        'd' => 'ก',
        'e' => 'ำ',
        'f' => 'ด',
        'g' => 'เ',
        'h' => '้',
        'i' => 'ร',
        'j' => '่',
        'k' => 'า',
        'l' => 'ส',
        'm' => 'ท',
        'n' => 'ื',
        'o' => 'น',
        'p' => 'ย',
        'q' => 'ๆ',
        'r' => 'พ',
        's' => 'ห',
        't' => 'ะ',
        'u' => 'ี',
        'v' => 'อ',
        'w' => 'ไ',
        'x' => 'ป',
        'y' => 'ั',
        'z' => 'ผ',
        '1' => 'ๅ',
        '2' => '/',
        '3' => '-',
        '4' => 'ภ',
        '5' => 'ถ',
        '6' => 'ุ',
        '7' => 'ึ',
        '8' => 'ค',
        '9' => 'ต',
        '0' => 'จ',
        '-' => 'ข',
        '=' => 'ช',
        '[' => 'บ',
        ']' => 'ล',
        '\\' => 'ฃ',
        ';' => 'ว',
        '\'' => 'ง',
        ',' => 'ม',
        '.' => 'ใ',
        '/' => 'ฝ',
        _ => c,
    }
}

// ─── ฟีเจอร์ใหม่: Text Snippet, Media & System ───────────────────────────────────

/// พิมพ์ข้อความอัตโนมัติ (Text Snippet)
pub fn type_text_snippet(text: &str) -> Result<(), String> {
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    // ใช้ enigo พิมพ์ข้อความออกไปตรงๆ เลย
    enigo.text(text).map_err(|e| e.to_string())?;
    println!(
        "[action-ring] Typed snippet: {}...",
        &text.chars().take(15).collect::<String>()
    );
    Ok(())
}

/// จัดการคำสั่ง Media / Audio
/// จัดการคำสั่ง Media / Audio (เวอร์ชันแก้ปัญหา Windows Mic Mute)
pub fn run_media_command(cmd: &str) -> Result<(), String> {
    // 💥 1. ดักจับคำสั่งปิดไมค์ (Mic Mute) แบบ Global ของจริง
    if cmd == "mic_mute" {
        #[cfg(target_os = "macos")]
        {
            let script = "
                set inputVolume to input volume of (get volume settings)
                if inputVolume = 0 then
                    set volume input volume 100
                else
                    set volume input volume 0
                end if
            ";
            let _ = std::process::Command::new("osascript")
                .args(["-e", script])
                .spawn();
            println!("[action-ring] Toggled mic mute via AppleScript (macOS)");
        }

        #[cfg(target_os = "windows")]
        {
            // ใช้ PowerShell ส่งคำสั่ง APPCOMMAND_MIC_MUTE (รหัส 24) ไปยัง Windows ส่วนกลาง
            // วิธีนี้จะชัวร์กว่าการใช้ keybd_event เพราะส่งตรงถึงระบบจัดการเสียงเลยครับ
            let ps_command = "
                $m = Add-Type -MemberDefinition '[DllImport(\"user32.dll\")] public static extern int SendMessage(int hWnd, int hMsg, int wParam, int lParam);' -Name 'MuteMic' -PassThru;
                $m::SendMessage(0xffff, 0x0319, 0, 24 * 0x10000);
            ";
            let _ = std::process::Command::new("powershell")
                .args(["-Command", ps_command])
                .spawn();
            println!("[action-ring] Toggled microphone mute via SendMessage (Windows)");
        }

        return Ok(());
    }

    // 💥 2. คำสั่ง Media อื่นๆ (Play, Pause, Volume) ใช้ enigo จัดการตามปกติ
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;

    let key = match cmd {
        "media_play_pause" => Key::MediaPlayPause,
        "media_next" => Key::MediaNextTrack,
        "media_prev" => Key::MediaPrevTrack,
        "volume_up" => Key::VolumeUp,
        "volume_down" => Key::VolumeDown,
        "volume_mute" => Key::VolumeMute,
        _ => return Err(format!("Unknown media command: {}", cmd)),
    };

    enigo
        .key(key, Direction::Click)
        .map_err(|e| e.to_string())?;
    println!("[action-ring] Media command executed: {}", cmd);

    Ok(())
}

/// จัดการคำสั่งระบบและหน้าต่าง (System / Window)
pub fn run_system_command(cmd: &str) -> Result<(), String> {
    match cmd {
        "sys_sleep" => {
            #[cfg(target_os = "windows")]
            let _ = Command::new("rundll32.exe")
                .args(["powrprof.dll,SetSuspendState", "0,1,0"])
                .spawn();
            #[cfg(target_os = "macos")]
            let _ = Command::new("pmset").arg("sleepnow").spawn();
        }
        "sys_lock" => {
            #[cfg(target_os = "windows")]
            let _ = Command::new("rundll32.exe")
                .args(["user32.dll,LockWorkStation"])
                .spawn();
            #[cfg(target_os = "macos")]
            let _ = Command::new("pmset").args(["displaysleepnow"]).spawn();
        }
        "win_show_desktop" => {
            // 💥 เปลี่ยนจาก unwrap() เป็นการจัดการ Error นุ่มๆ
            let mut enigo = Enigo::new(&Settings::default())
                .map_err(|e| format!("Need Accessibility Permission! ({})", e))?;

            let _ = enigo.key(Key::Meta, Direction::Press);
            let _ = enigo.key(Key::Unicode('d'), Direction::Click);
            let _ = enigo.key(Key::Meta, Direction::Release);
        }
        "win_close" => {
            // 💥 เปลี่ยนจาก unwrap() เป็นการจัดการ Error นุ่มๆ
            let mut enigo = Enigo::new(&Settings::default())
                .map_err(|e| format!("Need Accessibility Permission! ({})", e))?;

            #[cfg(target_os = "windows")]
            {
                let _ = enigo.key(Key::Alt, Direction::Press);
                let _ = enigo.key(Key::F4, Direction::Click);
                let _ = enigo.key(Key::Alt, Direction::Release);
            }
            #[cfg(target_os = "macos")]
            {
                let _ = enigo.key(Key::Meta, Direction::Press);
                let _ = enigo.key(Key::Unicode('w'), Direction::Click);
                let _ = enigo.key(Key::Meta, Direction::Release);
            }
        }
        _ => return Err(format!("Unknown system command: {}", cmd)),
    }

    println!("[action-ring] System command executed: {}", cmd);
    Ok(())
}
