import { useState } from "react";
import { HardDrive, Power, Download, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import { AppSettings } from "../SettingsPanel";
import { invoke } from "@tauri-apps/api/core";
import { ThemeStyle } from "../Theme";

export default function SystemDataSettings({ config, setConfig, activeTheme }: { config: AppSettings, setConfig: (c: AppSettings) => void, activeTheme: ThemeStyle }) {
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleExportAll = async () => {
    try {
      await invoke("export_all_data");
      showStatus("Export completed successfully.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleImportAll = async () => {
    try {
      await invoke("import_all_data");
      showStatus("Import successful! Reloading...");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFactoryReset = async () => {
    const confirmReset = window.confirm(
      "⚠️ WARNING: This will delete ALL profiles, slices, and settings.\n\nAre you absolutely sure you want to Factory Reset?"
    );
    if (!confirmReset) return;

    try {
      await invoke("factory_reset");
      alert("Factory Reset Complete. The app will now reload.");
      window.location.reload();
    } catch (err) {
      console.error("Reset failed:", err);
      alert("Failed to factory reset.");
    }
  };

  return (
    <div className={`border rounded-2xl p-6 space-y-6 transition-colors duration-500 ${activeTheme.isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
      <div className={`flex items-center justify-between border-b pb-4 ${activeTheme.isDark ? 'border-white/10' : 'border-black/10'}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><HardDrive size={20} /></div>
          <h3 className="text-md font-bold text-current">System & Data</h3>
        </div>
        
        {statusMsg && (
          <span className="text-xs font-bold text-emerald-500 flex items-center gap-1 animate-in fade-in slide-in-from-right-4">
            <CheckCircle2 size={14} /> {statusMsg}
          </span>
        )}
      </div>

      {/* Start with OS */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Power size={18} className="opacity-50" />
          <div>
            <label className="block text-sm font-semibold opacity-90">Start with OS</label>
            <p className="text-xs opacity-60 mt-1">Launch automatically on startup.</p>
          </div>
        </div>
        <button
          onClick={() => setConfig({ ...config, startWithOS: !config.startWithOS })}
          className={`w-11 h-6 rounded-full transition-colors relative ${config.startWithOS ? "bg-emerald-500" : (activeTheme.isDark ? "bg-white/20" : "bg-black/20")}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${config.startWithOS ? "left-6" : "left-1"}`} />
        </button>
      </div>

      {/* Backup & Restore */}
      <div className={`pt-6 border-t ${activeTheme.isDark ? 'border-white/10' : 'border-black/10'}`}>
        <label className="block text-sm font-semibold opacity-90 mb-3">Backup & Restore</label>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={handleExportAll}
            className={`flex items-center justify-center gap-2 py-2.5 border rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
              activeTheme.isDark ? 'bg-black/40 border-white/10 hover:border-white/30 hover:bg-white/5 text-zinc-300' : 'bg-white/60 border-black/10 hover:border-black/30 hover:bg-black/5 text-zinc-700'
            }`} 
          >
            <Download size={16} /> Export All
          </button>
          <button 
            onClick={handleImportAll}
            className={`flex items-center justify-center gap-2 py-2.5 border rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
              activeTheme.isDark ? 'bg-black/40 border-white/10 hover:border-white/30 hover:bg-white/5 text-zinc-300' : 'bg-white/60 border-black/10 hover:border-black/30 hover:bg-black/5 text-zinc-700'
            }`} 
          >
            <Upload size={16} /> Import All
          </button>
        </div>
        <button 
          onClick={handleFactoryReset}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-xl text-sm font-bold text-red-500 transition-all active:scale-[0.98]" 
        >
          <AlertTriangle size={16} /> Factory Reset
        </button>
      </div>
    </div>
  );
}