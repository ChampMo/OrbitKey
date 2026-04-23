import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ArrowLeft } from "lucide-react";

import InteractionSettings from "./SettingMenu/InteractionSettings";
import AppearanceSettings from "./SettingMenu/AppearanceSettings";
import SystemDataSettings from "./SettingMenu/SystemDataSettings";
import { THEMES, ThemeStyle } from "./Theme";

export interface AppSettings {
  globalHotkey: string;
  startWithOS: boolean;
  ringScale: number;
  closeAfterExec: boolean;
  triggerMode: string;
  animSpeed: string;
  deadzone: number;
  centerAction: string;
  theme: string;
}

// 💥 แก้ไขฟังก์ชันให้รับ Props 💥
export default function SettingsPanel({ onBack, initialConfig, activeTheme }: { onBack: () => void, initialConfig: AppSettings, activeTheme: ThemeStyle }) {
  // ใช้ค่าจาก Dashboard เป็นค่าเริ่มต้นทันที สีจะได้ไม่กระโดด
  const [config, setConfigState] = useState<AppSettings>(initialConfig || { theme: "dark" } as any);
  const [loading, setLoading] = useState(!initialConfig); // ถ้ามีค่าส่งมาแล้วก็ไม่ต้องโชว์ Loading

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // โหลดซ้ำอีกครั้งเพื่อความชัวร์ว่าข้อมูลล่าสุด
    invoke<AppSettings>("get_settings")
      .then((data) => {
        if (data) setConfigState(data);
        setLoading(false);
      })
      .catch((e) => {
        console.error("Failed to load settings:", e);
        setLoading(false);
      });
  }, []);

  const setConfig = useCallback((newConfig: AppSettings) => {
    setConfigState(newConfig);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      invoke("save_settings", { settings: newConfig }).catch(console.error);
    }, 400); 
  }, []);

  // 💥 แก้ไขหน้า Loading ให้ใช้สีธีมปัจจุบันแทนสีดำ 💥
  if (loading) {
    return (
      <div className={`absolute inset-0 flex items-center justify-center ${activeTheme.bg} ${activeTheme.text}`}>
        <div className="animate-pulse font-bold opacity-50">Loading Settings...</div>
      </div>
    );
  }

  // ใช้ธีมที่ส่งมาจากหน้าหลัก หรือธีมที่โหลดใหม่
  const currentTheme = THEMES[config?.theme] || activeTheme;

  return (
    <div className={`absolute inset-0 w-full h-full flex flex-col overflow-hidden font-sans transition-colors duration-500 ${currentTheme.bg} ${currentTheme.text}`}>
      <header className={`shrink-0 flex items-center px-8 py-5 border-b shadow-sm z-10 transition-colors duration-500 ${currentTheme.panel} ${currentTheme.border}`}>
        <button
          onClick={onBack}
          className={`flex items-center justify-center w-10 h-10 border rounded-full transition-all mr-4 shadow-sm ${
            currentTheme.isDark 
              ? 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10' 
              : 'bg-black/5 border-black/10 text-zinc-500 hover:text-black hover:bg-black/10'
          }`}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-extrabold tracking-wide">Settings</h2>
          <p className="text-xs opacity-60 font-medium">Customize your Action Ring experience</p>
        </div>
      </header>

      <main className="flex-1 p-8 overflow-y-auto custom-scrollbar relative">
        <div className={`absolute top-[-100px] left-1/2 -translate-x-1/2 w-[800px] h-[300px] blur-[100px] pointer-events-none rounded-full transition-opacity duration-500 ${
          currentTheme.isDark ? 'bg-indigo-500/10' : 'bg-indigo-500/5'
        }`} />
        
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10 pb-20">
          <div className="space-y-6">
            <InteractionSettings config={config} setConfig={setConfig} activeTheme={currentTheme} />
          </div>
          <div className="space-y-6">
            <AppearanceSettings config={config} setConfig={setConfig} activeTheme={currentTheme} />
            <SystemDataSettings config={config} setConfig={setConfig} activeTheme={currentTheme} />
          </div>
        </div>
      </main>
    </div>
  );
}