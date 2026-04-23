import { useState, useEffect } from "react";
import { Keyboard, Crosshair, Info } from "lucide-react";
import { AppSettings } from "../SettingsPanel";
import { ThemeStyle } from "../Theme";

export default function InteractionSettings({ config, setConfig, activeTheme }: { config: AppSettings, setConfig: (c: AppSettings) => void, activeTheme: ThemeStyle }) {
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
        if (keyName === " ") keyName = "Space";
        else if (keyName.length === 1) keyName = keyName.toUpperCase(); 
        else keyName = keyName.charAt(0).toUpperCase() + keyName.slice(1);
        
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
    <div className={`border rounded-2xl p-6 space-y-6 transition-colors duration-500 ${activeTheme.isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
      <div className={`flex items-center gap-3 border-b pb-4 ${activeTheme.isDark ? 'border-white/10' : 'border-black/10'}`}>
        <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg"><Keyboard size={20} /></div>
        <h3 className="text-md font-bold text-current">Interaction</h3>
      </div>

      {/* Global Hotkey */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-semibold opacity-90">Global Hotkey</label>
          <p className="text-xs opacity-60 mt-1">Shortcut to summon the Action Ring.</p>
        </div>
        <button
          onClick={() => setIsRecording(!isRecording)}
          className={`px-4 py-2 rounded-xl text-sm font-mono font-bold transition-all w-48 border ${
            isRecording 
              ? "bg-red-500/20 text-red-500 border-red-500/50 animate-pulse" 
              : (activeTheme.isDark ? "bg-black/40 text-indigo-400 border-white/10 hover:border-indigo-500/50" : "bg-white/60 text-indigo-600 border-black/10 hover:border-indigo-500/50")
          }`}
        >
          {isRecording ? "Listening..." : config.globalHotkey}
        </button>
      </div>

      {/* Trigger Mode */}
      <div className={`flex items-center justify-between pt-4 border-t ${activeTheme.isDark ? 'border-white/10' : 'border-black/10'}`}>
        <div>
          <div className="flex items-center gap-1.5">
            <label className="block text-sm font-semibold opacity-90">Trigger Mode</label>
            <div className="relative group flex items-center">
              <Info size={14} className="opacity-50 hover:opacity-100 cursor-help transition-opacity" />
              <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 border rounded-xl text-[11px] leading-tight opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl ${
                activeTheme.isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-700'
              }`}>
                <strong className={activeTheme.isDark ? "text-white" : "text-black"}>Click to Exec:</strong> Standard click to run.<br/>
                <strong className={`mt-1 block ${activeTheme.isDark ? "text-white" : "text-black"}`}>Release Hotkey:</strong> Hold hotkey, hover over an item, and release to run instantly.
                <div className={`absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent ${activeTheme.isDark ? 'border-t-zinc-800' : 'border-t-white'}`}></div>
              </div>
            </div>
          </div>
          <p className="text-xs opacity-60 mt-1 max-w-[250px]">Choose how actions are executed.</p>
        </div>
        <div className={`flex border rounded-xl p-1 ${activeTheme.isDark ? 'bg-black/40 border-white/10' : 'bg-white/60 border-black/10'}`}>
          <button 
            onClick={() => setConfig({ ...config, triggerMode: "click" })} 
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${!isReleaseMode ? (activeTheme.isDark ? "bg-white/20 text-white shadow-sm" : "bg-black/10 text-black shadow-sm font-bold") : "opacity-60 hover:opacity-100"}`}
          >
            Click to Exec
          </button>
          <button 
            onClick={() => setConfig({ ...config, triggerMode: "release", closeAfterExec: true })} 
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${isReleaseMode ? (activeTheme.isDark ? "bg-white/20 text-white shadow-sm" : "bg-black/10 text-black shadow-sm font-bold") : "opacity-60 hover:opacity-100"}`}
          >
            Release Hotkey
          </button>
        </div>
      </div>

      {/* Close After Exec */}
      <div className={`flex items-center justify-between pt-4 border-t transition-opacity ${isReleaseMode ? "opacity-50" : "opacity-100"} ${activeTheme.isDark ? 'border-white/10' : 'border-black/10'}`}>
        <div>
          <div className="flex items-center gap-1.5">
            <label className="block text-sm font-semibold opacity-90">Close After Execution</label>
            <div className="relative group flex items-center">
              <Info size={14} className="opacity-50 hover:opacity-100 cursor-help transition-opacity" />
              <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 border rounded-xl text-[11px] leading-tight opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl text-center ${
                activeTheme.isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-700'
              }`}>
                If disabled, the ring will stay open after clicking, allowing you to trigger multiple actions at once.
                <div className={`absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent ${activeTheme.isDark ? 'border-t-zinc-800' : 'border-t-white'}`}></div>
              </div>
            </div>
          </div>
          <p className="text-xs opacity-60 mt-1">
            {isReleaseMode ? "Always enabled in Release mode." : "Automatically hide ring after clicking."}
          </p>
        </div>
        <button
          onClick={() => {
            if (!isReleaseMode) setConfig({ ...config, closeAfterExec: !config.closeAfterExec });
          }}
          className={`w-11 h-6 rounded-full transition-colors relative ${
            isReleaseMode || config.closeAfterExec ? "bg-indigo-500" : (activeTheme.isDark ? "bg-white/20" : "bg-black/20")
          } ${isReleaseMode ? "cursor-not-allowed grayscale-[30%]" : "cursor-pointer"}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${isReleaseMode || config.closeAfterExec ? "left-6" : "left-1"}`} />
        </button>
      </div>

      {/* Deadzone */}
      <div className={`pt-4 border-t ${activeTheme.isDark ? 'border-white/10' : 'border-black/10'}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className="block text-sm font-semibold opacity-90">Center Deadzone ({config.deadzone}px)</label>
            <p className="text-xs opacity-60 mt-1">Distance before mouse focuses on an item.</p>
          </div>
          <Crosshair size={20} className="opacity-50" />
        </div>
        <input
          type="range" min="10" max="100" step="5"
          value={config.deadzone}
          onChange={(e) => setConfig({ ...config, deadzone: parseInt(e.target.value) })}
          className={`w-full accent-indigo-500 h-1.5 rounded-lg appearance-none cursor-pointer ${activeTheme.isDark ? 'bg-white/10' : 'bg-black/10'}`}
        />
      </div>
    </div>
  );
}