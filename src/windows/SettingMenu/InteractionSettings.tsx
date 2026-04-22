import React, { useState, useEffect } from "react";
import { Keyboard, Crosshair } from "lucide-react";
import { AppSettings } from "../SettingsPanel";

export default function InteractionSettings({ config, setConfig }: { config: AppSettings, setConfig: (c: AppSettings) => void }) {
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isRecording) return;
      e.preventDefault();
      
      if (e.key === "Escape") {
        setIsRecording(false);
        return;
      }

      const keys: string[] = [];
      // ปรับให้เป็นคำที่ Tauri Shortcut Parser ฝั่ง Rust เข้าใจเป๊ะๆ
      if (e.metaKey) keys.push("Command"); // Mac Cmd
      if (e.ctrlKey) keys.push("Control"); // Ctrl
      if (e.altKey) keys.push("Alt");      // Mac Option / Win Alt
      if (e.shiftKey) keys.push("Shift");  // Shift

      if (!["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
        let keyName = e.key;
        
        // แปลงปุ่มพิเศษให้ตัวพิมพ์ใหญ่ตัวแรก เช่น space -> Space, enter -> Enter
        if (keyName === " ") {
            keyName = "Space";
        } else if (keyName.length === 1) {
            keyName = keyName.toUpperCase(); // เช่น a -> A
        } else {
            keyName = keyName.charAt(0).toUpperCase() + keyName.slice(1);
        }
        
        keys.push(keyName);
        
        // ส่งไปอัปเดต State (แล้ว Auto-Save จะทำงานทันที)
        setConfig({ ...config, globalHotkey: keys.join("+") });
        setIsRecording(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRecording, config, setConfig]);
  
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
        <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><Keyboard size={20} /></div>
        <h3 className="text-md font-bold text-white">Interaction</h3>
      </div>

      {/* Global Hotkey */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-semibold text-zinc-200">Global Hotkey</label>
          <p className="text-xs text-zinc-500 mt-1">Shortcut to summon the Action Ring.</p>
        </div>
        <button
          onClick={() => setIsRecording(!isRecording)}
          className={`px-4 py-2 rounded-xl text-sm font-mono font-bold transition-all w-48 border ${
            isRecording ? "bg-red-500/20 text-red-400 border-red-500/50 animate-pulse" : "bg-zinc-950 text-indigo-400 border-zinc-800 hover:border-indigo-500/50"
          }`}
        >
          {isRecording ? "Listening..." : config.globalHotkey}
        </button>
      </div>

      {/* Trigger Mode */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
        <div>
          <label className="block text-sm font-semibold text-zinc-200">Trigger Mode</label>
          <p className="text-xs text-zinc-500 mt-1 max-w-[250px]">Choose how actions are executed.</p>
        </div>
        <div className="flex bg-zinc-950 border border-zinc-800 rounded-xl p-1">
          <button onClick={() => setConfig({ ...config, triggerMode: "click" })} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${config.triggerMode === "click" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}>Click to Exec</button>
          <button onClick={() => setConfig({ ...config, triggerMode: "release" })} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${config.triggerMode === "release" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}>Release Hotkey</button>
        </div>
      </div>

      {/* Close After Exec */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
        <div>
          <label className="block text-sm font-semibold text-zinc-200">Close After Execution</label>
          <p className="text-xs text-zinc-500 mt-1">Automatically hide ring after clicking.</p>
        </div>
        <button
          onClick={() => setConfig({ ...config, closeAfterExec: !config.closeAfterExec })}
          className={`w-11 h-6 rounded-full transition-colors relative ${config.closeAfterExec ? "bg-indigo-500" : "bg-zinc-700"}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${config.closeAfterExec ? "left-6" : "left-1"}`} />
        </button>
      </div>

      {/* Deadzone */}
      <div className="pt-4 border-t border-zinc-800/50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className="block text-sm font-semibold text-zinc-200">Center Deadzone ({config.deadzone}px)</label>
            <p className="text-xs text-zinc-500 mt-1">Distance before mouse focuses on an item.</p>
          </div>
          <Crosshair size={20} className="text-zinc-600" />
        </div>
        <input
          type="range" min="10" max="100" step="5"
          value={config.deadzone}
          onChange={(e) => setConfig({ ...config, deadzone: parseInt(e.target.value) })}
          className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  );
}