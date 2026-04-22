import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ArrowLeft } from "lucide-react";

import InteractionSettings from "./SettingMenu/InteractionSettings";
import AppearanceSettings from "./SettingMenu/AppearanceSettings";
import SystemDataSettings from "./SettingMenu/SystemDataSettings";

// โครงสร้างข้อมูลให้ตรงกับ AppSettings ใน Rust
export interface AppSettings {
  globalHotkey: string;
  startWithOS: boolean;
  ringScale: number;
  closeAfterExec: boolean;
  triggerMode: string;
  animSpeed: string;
  deadzone: number;
  centerAction: string;
}

const DEFAULT_CONFIG: AppSettings = {
  globalHotkey: "Control+Shift+Q",
  startWithOS: false,
  ringScale: 100,
  closeAfterExec: true,
  triggerMode: "click",
  animSpeed: "spring",
  deadzone: 30,
  centerAction: "close",
};

export default function SettingsPanel({ onBack }: { onBack: () => void }) {
  const [config, setConfigState] = useState<AppSettings>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  // ตัวช่วยหน่วงเวลาเซฟ (ป้องกันการเซฟรัวๆ ลงดิสก์เวลาเลื่อน Slider)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. โหลดข้อมูลตอนเปิดหน้า Settings
  useEffect(() => {
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

  // 2. ฟังก์ชันอัปเดต State และส่งไปเซฟที่ Rust แบบ Auto-Save
  const setConfig = useCallback((newConfig: AppSettings) => {
    setConfigState(newConfig);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      invoke("save_settings", { settings: newConfig }).catch(console.error);
    }, 400); // หน่วง 400ms ก่อนเซฟ
  }, []);

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#09090b] text-zinc-500">
        Loading Settings...
      </div>
    );
  }

  return (
    <div className="absolute inset-0 w-full h-full flex flex-col bg-[#09090b] text-zinc-100 overflow-hidden font-sans">
      {/* HEADER */}
      <header className="shrink-0 flex items-center px-8 py-5 bg-[#0c0c0e] border-b border-zinc-800/60 shadow-sm z-10">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-10 h-10 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-all mr-4 shadow-sm"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-wide">Settings</h2>
          <p className="text-xs text-zinc-500 font-medium">Customize your Action Ring experience</p>
        </div>
      </header>

      {/* BODY */}
      <main className="flex-1 p-8 overflow-y-auto custom-scrollbar relative">
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-indigo-500/10 blur-[100px] pointer-events-none rounded-full" />
        
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10 pb-20">
          <div className="space-y-6">
            <InteractionSettings config={config} setConfig={setConfig} />
          </div>
          <div className="space-y-6">
            <AppearanceSettings config={config} setConfig={setConfig} />
            <SystemDataSettings config={config} setConfig={setConfig} />
          </div>
        </div>
      </main>
    </div>
  );
}