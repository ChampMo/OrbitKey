/**
 * AppearanceSettings.tsx — UI for Theme, Scale, and Animation settings
 */

import { Monitor, Palette, Check } from "lucide-react";
import { AppSettings } from "../SettingsPanel";
import { THEME_LIST, ThemeStyle } from "../Theme";

export default function AppearanceSettings({ 
  config, 
  setConfig, 
  activeTheme 
}: { 
  config: AppSettings; 
  setConfig: (c: AppSettings) => void; 
  activeTheme: ThemeStyle;
}) {
  return (
    <div className={`border rounded-2xl p-6 space-y-8 transition-colors duration-500 ${activeTheme.isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
      
      {/* --- Section Header --- */}
      <div className={`flex items-center gap-3 border-b pb-4 ${activeTheme.isDark ? 'border-white/10' : 'border-black/10'}`}>
        <div className="p-2 bg-pink-500/10 text-pink-500 rounded-lg">
          <Monitor size={20} />
        </div>
        <h3 className="text-md font-bold text-current">Appearance & Animation</h3>
      </div>

      {/* --- Theme Selector --- */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Palette size={16} className="opacity-50" />
          <label className="block text-sm font-semibold opacity-90">App Theme</label>
        </div>
        
        <div className="grid grid-cols-3 gap-x-4 gap-y-6">
          {THEME_LIST.map((t) => {
            const isSelected = config.theme === t.id;
            
            return (
              <button
                key={t.id}
                onClick={() => setConfig({ ...config, theme: t.id as any })}
                className="group relative flex flex-col items-center gap-3 outline-none"
              >
                {/* 🎨 กล่องพรีวิวสี (Preview Card) */}
                <div className={`relative w-full h-14 rounded-xl transition-all duration-300 ease-out border overflow-hidden
                  ${isSelected 
                    ? 'scale-105 shadow-md' 
                    : `shadow-sm hover:scale-105 ${activeTheme.isDark ? 'border-white/10' : 'border-black/5'}`
                  } ${t.previewColor}`}
                >
                  {/* สีรอง (Accent Color) แปะไว้ซ้ายล่างเป็นรูปสามเหลี่ยม */}
                  <div 
                    className="absolute bottom-0 left-0 w-8 h-8 opacity-80"
                    style={{ 
                      background: `linear-gradient(to top right, ${t.accentColor} 50%, transparent 50%)` 
                    }}
                  />
                </div>
                {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 bg-pink-500 text-white rounded-full p-0.5 shadow-lg animate-in zoom-in duration-200 z-50">
                      <Check size={12} strokeWidth={4} />
                    </div>
                  )}
                {/* ชื่อธีม (Label) */}
                <span 
                  className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${
                    !isSelected ? 'text-current opacity-50 group-hover:opacity-100' : ''
                  }`}
                  style={{ color: isSelected ? t.accentColor : undefined }}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* --- Ring Scale --- */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className="block text-sm font-semibold opacity-90">Ring Scale ({config.ringScale}%)</label>
            <p className="text-[11px] opacity-50 mt-0.5">Adjust the overall size of the UI.</p>
          </div>
          <div className="text-xs font-black text-pink-500 bg-pink-500/10 px-2.5 py-1 rounded-lg border border-pink-500/20">
            x{config.ringScale / 100}
          </div>
        </div>
        
        <input
          type="range" min="50" max="150" step="5"
          value={config.ringScale}
          onChange={(e) => setConfig({ ...config, ringScale: parseInt(e.target.value) })}
          className={`w-full accent-pink-500 h-1.5 rounded-lg appearance-none cursor-pointer ${activeTheme.isDark ? 'bg-white/10' : 'bg-black/10'}`}
        />
        
        <div className="flex justify-between text-[9px] opacity-40 mt-2 font-bold px-1 uppercase tracking-tighter text-current">
          <span>Small (50%)</span>
          <span>Default (100%)</span>
          <span>Large (150%)</span>
        </div>
      </div>

      {/* --- Summon Animation --- */}
      <div className={`flex items-center justify-between pt-6 border-t ${activeTheme.isDark ? 'border-white/10' : 'border-black/10'}`}>
        <div>
          <label className="block text-sm font-semibold opacity-90">Summon Animation</label>
          <p className="text-[11px] opacity-50 mt-0.5">How the ring appears.</p>
        </div>
        
        <div className={`flex gap-1 border rounded-xl p-1 ${activeTheme.isDark ? 'bg-black/40 border-white/10' : 'bg-white/60 border-black/10'}`}>
          {["instant", "fast", "smooth", "spring"].map((speed) => (
            <button
              key={speed}
              onClick={() => setConfig({ ...config, animSpeed: speed })}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all ${
                config.animSpeed === speed 
                  ? (activeTheme.isDark ? "bg-white/20 text-white shadow-sm" : "bg-white text-black shadow-sm") 
                  : "opacity-40 hover:opacity-100 hover:bg-black/5 text-current"
              }`}
            >
              {speed}
            </button>
          ))}
        </div>
      </div>

      {/* 💥 --- Profile Switch Animation --- 💥 */}
      <div className={`flex items-center justify-between pt-6 border-t ${activeTheme.isDark ? 'border-white/10' : 'border-black/10'}`}>
        <div>
          <label className="block text-sm font-semibold opacity-90">Switch Animation</label>
          <p className="text-[11px] opacity-50 mt-0.5">Effect when changing profiles.</p>
        </div>
        
        <div className={`flex gap-1 border rounded-xl p-1 ${activeTheme.isDark ? 'bg-black/40 border-white/10' : 'bg-white/60 border-black/10'}`}>
          {[
            { id: "instant", label: "instant" },
            { id: "fade", label: "Smooth" }, // 💥 Fade หายอยู่กับที่
            { id: "cyber-spin", label: "Spin" }, // 💥 ควงสว่าน
            { id: "quantum-pop", label: "Pop" }, // 💥 หุบแล้วเด้งออก
          ].map((anim) => (
            <button
              key={anim.id}
              onClick={() => setConfig({ ...config, switchAnimStyle: anim.id })}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all ${
                config.switchAnimStyle === anim.id 
                  ? (activeTheme.isDark ? "bg-white/20 text-white shadow-sm" : "bg-white text-black shadow-sm") 
                  : "opacity-40 hover:opacity-100 hover:bg-black/5 text-current"
              }`}
            >
              {anim.label}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}