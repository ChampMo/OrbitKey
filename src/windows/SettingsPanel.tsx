import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ArrowLeft, Bug, Coffee } from 'lucide-react';
import ReportBug from './components/ReportBug';
import InteractionSettings from "./SettingMenu/InteractionSettings";
import AppearanceSettings from "./SettingMenu/AppearanceSettings";
import SystemDataSettings from "./SettingMenu/SystemDataSettings";
import { ThemeId, THEMES, ThemeStyle } from "./Theme";
import Support from './components/Support';



export interface AppSettings {
  globalHotkey: string;
  startWithOs: boolean;
  ringScale: number;
  closeAfterExec: boolean;
  triggerMode: string;
  animSpeed: string;
  deadzone: number;
  centerAction: string;
  theme: ThemeId;
  switchAnimStyle: string
}

// 💥 แก้ไขฟังก์ชันให้รับ Props 💥
export default function SettingsPanel({ onBack, initialConfig, activeTheme }: { onBack: () => void, initialConfig: AppSettings, activeTheme: ThemeStyle }) {
  // ใช้ค่าจาก Dashboard เป็นค่าเริ่มต้นทันที สีจะได้ไม่กระโดด
  const [config, setConfigState] = useState<AppSettings>(initialConfig || { theme: "dark" } as any);
  const [loading, setLoading] = useState(!initialConfig); // ถ้ามีค่าส่งมาแล้วก็ไม่ต้องโชว์ Loading
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);

  



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

        {/* ส่วนที่เพิ่มใหม่: ปุ่มทางขวา */}
        <div className="ml-auto flex items-center gap-3">
          {/* ปุ่ม Report Bug */}
          <button
            onClick={() => setIsBugModalOpen(true)}
            title="Report a bug"
            // 💥 1. เพิ่ม group และเปลี่ยนจาก gap-2 เป็น px-2.5 เพื่อให้ตอนหดตัวมันเป็นวงกลมพอดี
            className={`group flex items-center justify-center h-10 px-2.5 border rounded-full transition-all duration-300 shadow-sm text-sm ${
              currentTheme.isDark 
                ? 'bg-white/5 border-white/10 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/30' 
                : 'bg-black/5 border-black/10 text-zinc-500 hover:text-red-600 hover:bg-red-600/10 hover:border-red-600/30'
            }`}
          >
            {/* 💥 2. ล็อกขนาดไอคอนไม่ให้โดนบีบตอนแอนิเมชันด้วย shrink-0 */}
            <Bug size={18} className="shrink-0" />
            
            {/* 💥 3. ซ่อนข้อความไว้ แล้วขยายออกเฉพาะตอน hover (group-hover) */}
            <span className="overflow-hidden transition-all duration-300 whitespace-nowrap max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 group-hover:ml-2 font-medium">
              Report Bug
            </span>
          </button>

          {/* ปุ่ม Donate */}
          <button
            onClick={() => setIsSupportOpen(true)}
            title="Support OrbitKey"
            className={`group flex items-center justify-center h-10 px-2.5 border rounded-full transition-all duration-300 shadow-sm text-sm ${
              currentTheme.isDark 
                ? 'bg-white/5 border-white/10 text-zinc-400 hover:text-yellow-400 hover:bg-yellow-400/10 hover:border-yellow-400/30' 
                : 'bg-black/5 border-black/10 text-zinc-500 hover:text-yellow-600 hover:bg-yellow-600/10 hover:border-yellow-600/30'
            }`}
          >
            <Coffee size={18} className="shrink-0" />
            <span className="overflow-hidden transition-all duration-300 whitespace-nowrap max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 group-hover:ml-2 font-medium">
              Support
            </span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-8 overflow-y-auto custom-scrollbar relative">
        <div className={`absolute top-[-100px] left-1/2 -translate-x-1/2 w-[800px] h-[300px] blur-[100px] pointer-events-none rounded-full transition-opacity duration-500 ${
          currentTheme.isDark ? 'bg-indigo-500/10' : 'bg-indigo-500/5'
        }`} />
        
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10 pb-20 items-start">
          
          {/* 1. Interaction Settings: จอเล็กอยู่บนสุด / จอใหญ่อยู่ซ้ายบน */}
          <div className="order-1 lg:col-start-1 lg:row-start-1">
            <InteractionSettings config={config} setConfig={setConfig} activeTheme={currentTheme} />
          </div>

          {/* 2. Appearance Settings: จอเล็กอยู่ตรงกลาง / จอใหญ่อยู่คอลัมน์ขวายาวๆ */}
          <div className="order-2 lg:col-start-2 lg:row-start-1 lg:row-span-2">
            <AppearanceSettings config={config} setConfig={setConfig} activeTheme={currentTheme} />
          </div>

          {/* 3. System Data Settings: จอเล็กอยู่ล่างสุด / จอใหญ่อยู่ซ้ายล่าง (ต่อจาก Interaction) */}
          <div className="order-3 lg:col-start-1 lg:row-start-2">
            <SystemDataSettings config={config} setConfig={setConfig} activeTheme={currentTheme} />
          </div>

        </div>
      </main>
      <ReportBug 
        isOpen={isBugModalOpen} 
        onClose={() => setIsBugModalOpen(false)} 
        currentTheme={currentTheme} 
      />
      <Support 
        isOpen={isSupportOpen} 
        onClose={() => setIsSupportOpen(false)} 
        currentTheme={currentTheme} 
      />
      
    </div>
    
  );
}