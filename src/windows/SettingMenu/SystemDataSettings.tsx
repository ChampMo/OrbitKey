import { useState } from "react";
import { HardDrive, Power, Download, Loader2, Upload, AlertTriangle, CheckCircle2, X, RotateCcw, RefreshCw } from "lucide-react"; // เพิ่ม RefreshCw
import { AppSettings } from "../SettingsPanel";
import { invoke } from "@tauri-apps/api/core";
import { ThemeStyle } from "../Theme";
import { relaunch } from '@tauri-apps/plugin-process';

// 💥 1. เพิ่ม Props สำหรับระบบ Update เข้ามาตรงนี้
export default function SystemDataSettings({ 
  config, setConfig, activeTheme, 
  availableUpdate, manualCheck 
}: { 
  config: AppSettings, 
  setConfig: (c: AppSettings) => void, 
  activeTheme: ThemeStyle,
  availableUpdate: any,
  manualCheck: () => Promise<void>
}) {
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleExportAll = async () => {
    try {
      await invoke("export_all_data");
      showStatus("Export completed successfully.");
    } catch (err) { console.error(err); }
  };

  const handleImportAll = async () => {
    try {
      await invoke("import_all_data");
      showStatus("Import successful! Reloading...");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) { console.error(err); }
  };

  const performFactoryReset = async () => {
    try {
      await invoke("factory_reset");
      setShowResetConfirm(false);
      window.location.reload();
    } catch (err) { console.error("Reset failed:", err); }
  };

    const handleUpdate = async () => {
    try {
      setIsUpdating(true); // เปลี่ยนปุ่มเป็นสถานะกำลังโหลด
      await availableUpdate.downloadAndInstall(); // ใช้ availableUpdate แทน pendingUpdate
      await relaunch();
    } catch (e) {
      console.error(e);
      setIsUpdating(false);
      alert("Failed to update. Please try again.");
    }
  };

  return (
    <div className={`border rounded-2xl p-6 space-y-6 transition-colors duration-500 ${activeTheme.isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
      
      {/* --- Factory Reset Popup (โค้ดเดิมของแชมป์) --- */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)} />
          <div className={`relative w-full max-w-sm border shadow-2xl rounded-3xl p-8 animate-in zoom-in-95 duration-200 ${activeTheme.panel} ${activeTheme.border}`}>
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center animate-bounce">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-current">Factory Reset?</h3>
                <p className="text-sm opacity-60 leading-relaxed">
                  This action will **permanently delete** all your custom profiles, ring slices, and personal settings.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full pt-2">
                <button type="button" onClick={() => setShowResetConfirm(false)} className={`py-3 rounded-xl text-sm font-bold border transition-all ${activeTheme.isDark ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'}`}>Cancel</button>
                <button type="button" onClick={performFactoryReset} className="py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 active:scale-95 flex items-center justify-center gap-2"><RotateCcw size={16} /> Reset All</button>
              </div>
            </div>
            <button onClick={() => setShowResetConfirm(false)} className="absolute top-4 right-4 p-2 opacity-40 hover:opacity-100 transition-opacity"><X size={20} /></button>
          </div>
        </div>
      )}

      {/* Header */}
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

      <div className="space-y-6">
        {/* 🚀 แถวที่ 1: Software Update (เพิ่มใหม่) */}
        <div 
          className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-500 ${
            availableUpdate 
              ? 'shadow-inner' 
              : 'bg-transparent'
          } ${activeTheme.border}`} // ใช้สีขอบจากธีม
          style={availableUpdate ? { 
            // ถ้ามีอัปเดต ให้ทำพื้นหลังจางๆ ตามสี Accent ของธีมนั้นๆ
            backgroundColor: `${activeTheme.accentColor}10`, 
            borderColor: `${activeTheme.accentColor}40` 
          } : {}}
        >
          <div className="flex items-center gap-3 text-current">
            {/* ส่วน Icon: ใช้สี accentText ของธีม */}
            <div 
              className={`p-2 rounded-xl transition-colors ${availableUpdate ? '' : 'opacity-40'}`}
              style={availableUpdate ? { backgroundColor: `${activeTheme.accentColor}20` } : {}}
            >
              <RefreshCw 
                size={18} 
                className={`${availableUpdate ? `${activeTheme.accentText} animate-spin-slow` : 'text-current'}`} 
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <label className={`block text-sm font-semibold opacity-90 ${activeTheme.text}`}>
                  Software Update
                </label>
                {availableUpdate && (
                  <span 
                    className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                    
                  />
                )}
              </div>
              <p className={`text-[10px] opacity-60 ${activeTheme.text}`}>
                {availableUpdate ? `New version v${availableUpdate.version} ready` : `Your software is up to date.`}
              </p>
            </div>
          </div>

          {/* ส่วนปุ่ม: ถ้ามีอัปเดต ใช้ปุ่ม Primary ของธีมนั้นๆ เลย */}
          <button
            type="button"
            disabled={isUpdating} // 💥 ปิดปุ่มกันคนกดรัวๆ
            onClick={availableUpdate ? handleUpdate : manualCheck} // 💥 แก้บั๊ก onClick ตรงนี้
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              isUpdating ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'
            } ${
              availableUpdate 
                ? activeTheme.primaryBtn 
                : `${activeTheme.isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'} opacity-60`
            }`}
          >
            {/* 💥 เปลี่ยนข้อความปุ่มตามสถานะ */}
            {isUpdating ? (
              <><Loader2 size={14} className="animate-spin" /> Updating...</>
            ) : (
              availableUpdate ? 'Update' : 'Check'
            )}
          </button>
        </div>

                {/* 💥 แถวที่ 2: Start with OS */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-current">
            <Power size={18} className="opacity-50" />
            <div>
              <label className="block text-sm font-semibold opacity-90">Start with OS</label>
              <p className="text-[10px] opacity-60">Launch automatically on startup.</p>
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

        
      </div>

      {/* Backup & Restore */}
      <div className={`pt-6 border-t ${activeTheme.isDark ? 'border-white/10' : 'border-black/10'}`}>
        <label className="block text-sm font-semibold opacity-90 mb-3 text-current">Backup & Restore</label>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={handleExportAll} className={`flex items-center justify-center gap-2 py-2.5 border rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${activeTheme.isDark ? 'bg-black/40 border-white/10 hover:border-white/30 text-zinc-300' : 'bg-white/60 border-black/10 hover:border-black/30 text-zinc-700'}`}><Download size={16} /> Export All</button>
          <button type="button" onClick={handleImportAll} className={`flex items-center justify-center gap-2 py-2.5 border rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${activeTheme.isDark ? 'bg-black/40 border-white/10 hover:border-white/30 text-zinc-300' : 'bg-white/60 border-black/10 hover:border-black/30 text-zinc-700'}`}><Upload size={16} /> Import All</button>
        </div>
        <button type="button" onClick={() => setShowResetConfirm(true)} className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-xl text-sm font-bold text-red-500 transition-all active:scale-[0.98]"><AlertTriangle size={16} /> Factory Reset</button>
      </div>
    </div>
  );
}