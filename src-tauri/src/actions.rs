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
pub fn simulate_shortcut(shortcut: &str) -> Result<(), String> {
    // ── 1. Tokenise ──────────────────────────────────────────────────────────
    let lower = shortcut.to_lowercase();
    let tokens: Vec<&str> = lower
        .split('+')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .collect();

    if tokens.is_empty() {
        return Err(format!("Empty shortcut string: {:?}", shortcut));
    }

    // Everything before the last token is a modifier; the last token is the key.
    let (mod_tokens, key_tokens) = tokens.split_at(tokens.len() - 1);
    let key_str = key_tokens[0];

    let modifiers: Vec<Key> = mod_tokens
        .iter()
        .map(|s| parse_modifier(s))
        .collect::<Result<_, _>>()?;

    let main_key = parse_key(key_str)?;

    // ── 2. Initialise enigo ──────────────────────────────────────────────────
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| {
        format!(
            "Failed to initialise input simulator: {e}\n\
             On macOS, grant Accessibility access to this app in\n\
             System Preferences → Privacy & Security → Accessibility."
        )
    })?;

    // ── 3. Press modifiers (order-preserved) ─────────────────────────────────
    for &modifier in &modifiers {
        enigo
            .key(modifier, Direction::Press)
            .map_err(|e| format!("Modifier press failed ({modifier:?}): {e}"))?;
    }

    // Short pause so the OS registers the full modifier state
    // before the main key event arrives.
    std::thread::sleep(Duration::from_millis(20));

    // ── 4. Click main key ────────────────────────────────────────────────────
    if let Err(e) = enigo.key(main_key, Direction::Click) {
        let mut recovered = false;

        // 🇹🇭 ท่าเจาะเกราะภาษาไทย: ถ้ากดภาษาอังกฤษไม่ติด แปลว่าคีย์บอร์ดเป็นภาษาไทยอยู่
        // เราจะเอาอักษรนั้นไปแปลงเป็นแป้นพิมพ์เกษมณี แล้วส่งให้ Windows/Mac สั่งกดใหม่!
        if let Key::Unicode(c) = main_key {
            let thai_char = eng_to_thai_kedmanee(c);
            if thai_char != c {
                if enigo.key(Key::Unicode(thai_char), Direction::Click).is_ok() {
                    recovered = true;
                    println!(
                        "[action-ring] ทะลุเกราะภาษาไทยสำเร็จ! (แปลง {} เป็น {})",
                        c, thai_char
                    );
                }
            }
        }

        if !recovered {
            return Err(format!("Key click failed ({key_str:?}): {e}"));
        }
    }

    println!("[action-ring] Shortcut simulated: {shortcut}");
    Ok(())
}

/// Map a lowercase modifier token to an [`enigo::Key`].
fn parse_modifier(s: &str) -> Result<Key, String> {
    match s {
        "ctrl" | "control" => Ok(Key::Control),
        "shift" => Ok(Key::Shift),
        "alt" | "option" => Ok(Key::Alt),
        // Meta == macOS ⌘ Command  |  Windows ⊞  |  Linux Super
        "cmd" | "command" | "meta" | "win" | "super" => Ok(Key::Meta),
        other => Err(format!("Unknown modifier: {other:?}")),
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
    println!("[action-ring] Typed snippet: {}...", &text.chars().take(15).collect::<String>());
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
            let _ = std::process::Command::new("osascript").args(["-e", script]).spawn();
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

    enigo.key(key, Direction::Click).map_err(|e| e.to_string())?;
    println!("[action-ring] Media command executed: {}", cmd);
    
    Ok(())
}

/// จัดการคำสั่งระบบและหน้าต่าง (System / Window)
pub fn run_system_command(cmd: &str) -> Result<(), String> {
    match cmd {
        "sys_sleep" => {
            #[cfg(target_os = "windows")]
            let _ = Command::new("rundll32.exe").args(["powrprof.dll,SetSuspendState", "0,1,0"]).spawn();
            #[cfg(target_os = "macos")]
            let _ = Command::new("pmset").arg("sleepnow").spawn();
        }
        "sys_lock" => {
            #[cfg(target_os = "windows")]
            let _ = Command::new("rundll32.exe").args(["user32.dll,LockWorkStation"]).spawn();
            #[cfg(target_os = "macos")]
            let _ = Command::new("pmset").args(["displaysleepnow"]).spawn();
        }
        "win_show_desktop" => {
            // แฮ็กง่ายๆ ด้วยการส่งคำสั่งคีย์บอร์ด Win + D
            let mut enigo = Enigo::new(&Settings::default()).unwrap();
            let _ = enigo.key(Key::Meta, Direction::Press);
            let _ = enigo.key(Key::Unicode('d'), Direction::Click);
            let _ = enigo.key(Key::Meta, Direction::Release);
        }
        "win_close" => {
            // แฮ็กง่ายๆ ด้วยการกด Alt+F4 (Win) หรือ Cmd+W (Mac)
            let mut enigo = Enigo::new(&Settings::default()).unwrap();
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