import { useState } from "react";
import { HardDrive, Power, Download, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import { AppSettings } from "../SettingsPanel";
import { invoke } from "@tauri-apps/api/core";

export default function SystemDataSettings({ config, setConfig }: { config: AppSettings, setConfig: (c: AppSettings) => void }) {
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // ฟังก์ชันแสดงข้อความชั่วคราว
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
      // ถ้ากดยกเลิก (Cancel) มันจะโยน Error กลับมา เราก็ปล่อยผ่านได้
    }
  };

  const handleImportAll = async () => {
    try {
      await invoke("import_all_data");
      showStatus("Import successful! Reloading...");
      setTimeout(() => window.location.reload(), 1500); // รีโหลดแอปเพื่อดึงข้อมูลใหม่
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
    <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><HardDrive size={20} /></div>
          <h3 className="text-md font-bold text-white">System & Data</h3>
        </div>
        
        {/* ข้อความแจ้งเตือนสถานะมุมขวาบน */}
        {statusMsg && (
          <span className="text-xs font-medium text-emerald-400 flex items-center gap-1 animate-in fade-in slide-in-from-right-4">
            <CheckCircle2 size={14} /> {statusMsg}
          </span>
        )}
      </div>

      {/* Start with OS */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Power size={18} className="text-zinc-500" />
          <div>
            <label className="block text-sm font-semibold text-zinc-200">Start with OS</label>
            <p className="text-xs text-zinc-500 mt-1">Launch automatically on startup.</p>
          </div>
        </div>
        <button
          onClick={() => setConfig({ ...config, startWithOS: !config.startWithOS })}
          className={`w-11 h-6 rounded-full transition-colors relative ${config.startWithOS ? "bg-emerald-500" : "bg-zinc-700"}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${config.startWithOS ? "left-6" : "left-1"}`} />
        </button>
      </div>

      {/* Backup & Restore */}
      <div className="pt-6 border-t border-zinc-800/50">
        <label className="block text-sm font-semibold text-zinc-200 mb-3">Backup & Restore</label>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={handleExportAll}
            className="flex items-center justify-center gap-2 py-2.5 bg-zinc-950 border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800 rounded-xl text-sm font-semibold text-zinc-300 transition-all active:scale-[0.98]" 
          >
            <Download size={16} /> Export All
          </button>
          <button 
            onClick={handleImportAll}
            className="flex items-center justify-center gap-2 py-2.5 bg-zinc-950 border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800 rounded-xl text-sm font-semibold text-zinc-300 transition-all active:scale-[0.98]" 
          >
            <Upload size={16} /> Import All
          </button>
        </div>
        <button 
          onClick={handleFactoryReset}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-xl text-sm font-semibold text-red-500 transition-all active:scale-[0.98]" 
        >
          <AlertTriangle size={16} /> Factory Reset
        </button>
      </div>
    </div>
  );
}