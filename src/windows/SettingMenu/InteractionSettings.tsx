import { useState, useEffect } from "react";
import { Keyboard, Crosshair, Info } from "lucide-react"; // 💥 เพิ่ม Info เข้ามา
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
      if (e.metaKey) keys.push("Command"); 
      if (e.ctrlKey) keys.push("Control"); 
      if (e.altKey) keys.push("Alt");      
      if (e.shiftKey) keys.push("Shift");  

      if (!["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
        let keyName = e.key;
        
        if (keyName === " ") {
            keyName = "Space";
        } else if (keyName.length === 1) {
            keyName = keyName.toUpperCase(); 
        } else {
            keyName = keyName.charAt(0).toUpperCase() + keyName.slice(1);
        }
        
        keys.push(keyName);
        setConfig({ ...config, globalHotkey: keys.join("+") });
        setIsRecording(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRecording, config, setConfig]);
  
  const isReleaseMode = config.triggerMode === "release";

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
          <div className="flex items-center gap-1.5">
            <label className="block text-sm font-semibold text-zinc-200">Trigger Mode</label>
            {/* 💥 Tooltip สำหรับ Trigger Mode */}
            <div className="relative group flex items-center">
              <Info size={14} className="text-zinc-500 hover:text-zinc-300 cursor-help transition-colors" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-[11px] leading-tight text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                <strong className="text-white">Click to Exec:</strong> Standard click to run.<br/>
                <strong className="text-white mt-1 block">Release Hotkey:</strong> Hold hotkey, hover over an item, and release to run instantly.
                {/* ลูกศรชี้ลง */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-700"></div>
              </div>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-1 max-w-[250px]">Choose how actions are executed.</p>
        </div>
        <div className="flex bg-zinc-950 border border-zinc-800 rounded-xl p-1">
          <button 
            onClick={() => setConfig({ ...config, triggerMode: "click" })} 
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${!isReleaseMode ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Click to Exec
          </button>
          <button 
            onClick={() => setConfig({ ...config, triggerMode: "release", closeAfterExec: true })} 
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${isReleaseMode ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Release Hotkey
          </button>
        </div>
      </div>

      {/* Close After Exec */}
      <div className={`flex items-center justify-between pt-4 border-t border-zinc-800/50 transition-opacity ${isReleaseMode ? "opacity-60" : "opacity-100"}`}>
        <div>
          <div className="flex items-center gap-1.5">
            <label className="block text-sm font-semibold text-zinc-200">Close After Execution</label>
            {/* 💥 Tooltip สำหรับ Close After Execution */}
            <div className="relative group flex items-center">
              <Info size={14} className="text-zinc-500 hover:text-zinc-300 cursor-help transition-colors" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-[11px] leading-tight text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl text-center">
                If disabled, the ring will stay open after clicking, allowing you to trigger multiple actions at once.
                {/* ลูกศรชี้ลง */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-700"></div>
              </div>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {isReleaseMode ? "Always enabled in Release mode." : "Automatically hide ring after clicking."}
          </p>
        </div>
        <button
          onClick={() => {
            if (!isReleaseMode) {
              setConfig({ ...config, closeAfterExec: !config.closeAfterExec });
            }
          }}
          className={`w-11 h-6 rounded-full transition-colors relative ${
            isReleaseMode || config.closeAfterExec ? "bg-indigo-500" : "bg-zinc-700"
          } ${isReleaseMode ? "cursor-not-allowed grayscale-[30%]" : "cursor-pointer"}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${isReleaseMode || config.closeAfterExec ? "left-6" : "left-1"}`} />
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