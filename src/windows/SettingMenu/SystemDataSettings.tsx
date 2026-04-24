import { useState } from "react";
import { HardDrive, Power, Download, Upload, AlertTriangle, CheckCircle2, X, RotateCcw } from "lucide-react";
import { AppSettings } from "../SettingsPanel";
import { invoke } from "@tauri-apps/api/core";
import { ThemeStyle } from "../Theme";

export default function SystemDataSettings({ config, setConfig, activeTheme }: { config: AppSettings, setConfig: (c: AppSettings) => void, activeTheme: ThemeStyle }) {
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false); // 💥 State สำหรับเปิด/ปิด Popup

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

  const performFactoryReset = async () => {
    try {
      await invoke("factory_reset");
      setShowResetConfirm(false);

      window.location.reload();
    } catch (err) {
      console.error("Reset failed:", err);
    }
  };

  return (
    <div className={`border rounded-2xl p-6 space-y-6 transition-colors duration-500 ${activeTheme.isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
      
      {/* 💥 Custom Factory Reset Popup 💥 */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setShowResetConfirm(false)} 
          />
          
          {/* Modal Panel */}
          <div className={`relative w-full max-w-sm border shadow-2xl rounded-3xl p-8 animate-in zoom-in-95 duration-200 ${activeTheme.panel} ${activeTheme.border}`}>
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center animate-bounce">
                <AlertTriangle size={32} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-current">Factory Reset?</h3>
                <p className="text-sm opacity-60 leading-relaxed">
                  This action will **permanently delete** all your custom profiles, ring slices, and personal settings. This cannot be undone.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className={`py-3 rounded-xl text-sm font-bold border transition-all ${activeTheme.isDark ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={performFactoryReset}
                  className="py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} /> Reset All
                </button>
              </div>
            </div>

            {/* Close Button Corner */}
            <button 
              onClick={() => setShowResetConfirm(false)}
              className="absolute top-4 right-4 p-2 opacity-40 hover:opacity-100 transition-opacity"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* --- Main UI Content --- */}
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
        <div className="flex items-center gap-3 text-current">
          <Power size={18} className="opacity-50" />
          <div>
            <label className="block text-sm font-semibold opacity-90">Start with OS</label>
            <p className="text-xs opacity-60 mt-1">Launch automatically on startup.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setConfig({ ...config, startWithOS: !config.startWithOS })}
          className={`w-11 h-6 rounded-full transition-colors relative ${config.startWithOS ? "bg-emerald-500" : (activeTheme.isDark ? "bg-white/20" : "bg-black/20")}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${config.startWithOS ? "left-6" : "left-1"}`} />
        </button>
      </div>

      {/* Backup & Restore */}
      <div className={`pt-6 border-t ${activeTheme.isDark ? 'border-white/10' : 'border-black/10'}`}>
        <label className="block text-sm font-semibold opacity-90 mb-3 text-current">Backup & Restore</label>
        <div className="grid grid-cols-2 gap-3">
          <button 
            type="button"
            onClick={handleExportAll}
            className={`flex items-center justify-center gap-2 py-2.5 border rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
              activeTheme.isDark ? 'bg-black/40 border-white/10 hover:border-white/30 hover:bg-white/5 text-zinc-300' : 'bg-white/60 border-black/10 hover:border-black/30 hover:bg-black/5 text-zinc-700'
            }`} 
          >
            <Download size={16} /> Export All
          </button>
          <button 
            type="button"
            onClick={handleImportAll}
            className={`flex items-center justify-center gap-2 py-2.5 border rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
              activeTheme.isDark ? 'bg-black/40 border-white/10 hover:border-white/30 hover:bg-white/5 text-zinc-300' : 'bg-white/60 border-black/10 hover:border-black/30 hover:bg-black/5 text-zinc-700'
            }`} 
          >
            <Upload size={16} /> Import All
          </button>
        </div>
        
        {/* ปุ่ม Reset ที่จะเปิด Custom Popup */}
        <button 
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-xl text-sm font-bold text-red-500 transition-all active:scale-[0.98]" 
        >
          <AlertTriangle size={16} /> Factory Reset
        </button>
      </div>
    </div>
  );
}