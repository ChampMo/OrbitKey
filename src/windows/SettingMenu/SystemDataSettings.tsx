import { useEffect, useState } from "react";
import { HardDrive, Power, Download, Loader2, Upload, AlertTriangle, CheckCircle2, X, RotateCcw, RefreshCw } from "lucide-react";
import { AppSettings } from "../SettingsPanel";
import { invoke } from "@tauri-apps/api/core";
import { ThemeStyle } from "../Theme";
import { relaunch } from '@tauri-apps/plugin-process';
import Alert from "../components/Alert";
import { check } from '@tauri-apps/plugin-updater';
import { getVersion } from '@tauri-apps/api/app';

export default function SystemDataSettings({ 
  config, setConfig, activeTheme
}: { 
  config: AppSettings, 
  setConfig: (c: AppSettings) => void, 
  activeTheme: ThemeStyle,
}) {
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [availableUpdate, setAvailableUpdate] = useState<any>(null);
  const [appVersion, setAppVersion] = useState<string>('...');

  // ดึงเลขเวอร์ชันปัจจุบันจาก tauri.conf.json
  useEffect(() => {
    getVersion().then((version) => {
      setAppVersion(version);
    }).catch(console.error);
  }, []);
  
  // เช็คอัปเดตอัตโนมัติตอนเปิดหน้าต่าง
  useEffect(() => {
    const autoCheck = async () => {
      try {
        const update = await check();
        if (update) {
          setAvailableUpdate(update);
        }
      } catch (e) {
        console.error("Update check failed:", e);
      }
    };
    autoCheck();
  }, []);

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

  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, title?: string, message: string, type: 'error' | 'success' | 'info'}>({
    isOpen: false,
    message: '',
    type: 'info'
  });

  const handleUpdate = async () => {
    try {
      setIsUpdating(true);
      await availableUpdate.downloadAndInstall();
      await relaunch();
    } catch (e) {
      console.error(e);
      setIsUpdating(false);
      setAlertConfig({
        isOpen: true,
        title: "Update Failed",
        message: "Failed to download or install the update. Please check your connection and try again.",
        type: 'error'
      });
    }
  };

  const manualCheck = async () => {
    try {
      const update = await check();
      if (update) {
        setAvailableUpdate(update);
        setAlertConfig({
          isOpen: true,
          title: "Update Found!",
          message: `New version v${update.version} is ready to fly. Click Update to install.`,
          type: 'success'
        });
      } else {
        setAlertConfig({
          isOpen: true,
          title: "Up to Date",
          message: `OrbitKey v${appVersion} is already the latest version. You're good to go! 🛰️`,
          type: 'success'
        });
      }
    } catch (e) {
      setAlertConfig({
        isOpen: true,
        title: "Check Failed",
        message: "Oops! We couldn't reach the update server. Please check your internet.",
        type: 'error'
      });
    }
  };

  return (
    <div className={`border rounded-2xl p-6 space-y-6 transition-colors duration-500 ${activeTheme.isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
      
      {/* --- Factory Reset Popup --- */}
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
                  This action will <strong>permanently delete</strong> all your custom profiles, ring slices, and personal settings.
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

      {/* --- Header --- */}
      <div className={`flex items-center justify-between border-b pb-4 ${activeTheme.isDark ? 'border-white/10' : 'border-black/10'}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><HardDrive size={20} /></div>
          <div className="flex items-center gap-3">
             <h3 className="text-md font-bold text-current">System & Data</h3>
             {/* 💥 ป้ายโชว์เวอร์ชันแอป */}
             <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border ${
               activeTheme.isDark ? 'bg-white/10 border-white/5 text-white/60' : 'bg-black/5 border-black/5 text-black/60'
             }`}>
               v{appVersion}
             </span>
          </div>
        </div>
        {statusMsg && (
          <span className="text-xs font-bold text-emerald-500 flex items-center gap-1 animate-in fade-in slide-in-from-right-4">
            <CheckCircle2 size={14} /> {statusMsg}
          </span>
        )}
      </div>

      <div className="space-y-6">
        {/* --- แถวที่ 1: Software Update --- */}
        <div 
          className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-500 ${
            availableUpdate ? 'shadow-inner' : 'bg-transparent'
          } ${activeTheme.border}`}
          style={availableUpdate ? { 
            backgroundColor: `${activeTheme.accentColor}10`, 
            borderColor: `${activeTheme.accentColor}40` 
          } : {}}
        >
          <div className="flex items-center gap-3 text-current">
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
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                )}
              </div>
              {/* 💥 โชว์เวอร์ชันเปรียบเทียบตรงนี้ */}
              <p className={`text-[10px] font-medium opacity-60 mt-0.5 ${activeTheme.text}`}>
                {availableUpdate 
                  ? `Current: v${appVersion} → New: v${availableUpdate.version}` 
                  : `OrbitKey v${appVersion} is up to date.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isUpdating}
            onClick={availableUpdate ? handleUpdate : manualCheck}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              isUpdating ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'
            } ${
              availableUpdate 
                ? activeTheme.primaryBtn 
                : `${activeTheme.isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'} opacity-60`
            }`}
          >
            {isUpdating ? (
              <><Loader2 size={14} className="animate-spin" /> Updating...</>
            ) : (
              availableUpdate ? 'Update' : 'Check Update'
            )}
          </button>
        </div>

        {/* --- แถวที่ 2: Start with OS --- */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-current">
            <Power size={18} className="opacity-50" />
            <div>
              <label className="block text-sm font-semibold opacity-90">Start with OS</label>
              <p className="text-[10px] opacity-60 mt-0.5">Launch automatically on startup.</p>
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

      {/* --- Backup & Restore --- */}
      <div className={`pt-6 border-t ${activeTheme.isDark ? 'border-white/10' : 'border-black/10'}`}>
        <label className="block text-sm font-semibold opacity-90 mb-3 text-current">Backup & Restore</label>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={handleExportAll} className={`flex items-center justify-center gap-2 py-2.5 border rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${activeTheme.isDark ? 'bg-black/40 border-white/10 hover:border-white/30 text-zinc-300' : 'bg-white/60 border-black/10 hover:border-black/30 text-zinc-700'}`}><Download size={16} /> Export All</button>
          <button type="button" onClick={handleImportAll} className={`flex items-center justify-center gap-2 py-2.5 border rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${activeTheme.isDark ? 'bg-black/40 border-white/10 hover:border-white/30 text-zinc-300' : 'bg-white/60 border-black/10 hover:border-black/30 text-zinc-700'}`}><Upload size={16} /> Import All</button>
        </div>
        <button type="button" onClick={() => setShowResetConfirm(true)} className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-xl text-sm font-bold text-red-500 transition-all active:scale-[0.98]"><AlertTriangle size={16} /> Factory Reset</button>
      </div>

      <Alert 
         isOpen={alertConfig.isOpen}
         title={alertConfig.title}
         message={alertConfig.message}
         type={alertConfig.type}
         activeTheme={activeTheme}
         onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
       />
    </div>
  );
}