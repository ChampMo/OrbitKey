/**
 * App.tsx — Root component.
 *
 * Tauri creates two separate WebviewWindow instances, both loading the same
 * index.html. We detect which window we're in via `getCurrentWebviewWindow().label`
 * and render the appropriate UI — no URL routing needed.
 *
 * Windows:
 *   "main"        → Control Panel (settings / profile editor)
 *   "action-ring" → Transparent overlay ring (summoned by global hotkey)
 */
import { useEffect } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import ControlPanel from "./windows/ControlPanel";
import ActionRing from "./windows/ActionRing";

const appWindow = getCurrentWebviewWindow();

function App() {
  // Add a class to <html> so CSS can scope styles per window type.
  useEffect(() => {
    if (appWindow.label === "action-ring") {
      document.documentElement.classList.add("ring-window");
    }
  }, []);

  if (appWindow.label === "action-ring") {
    return <ActionRing />;
  }

  return <ControlPanel />;
}

export default App;
