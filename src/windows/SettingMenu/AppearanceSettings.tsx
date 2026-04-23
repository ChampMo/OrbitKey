import { Monitor, Palette } from "lucide-react";
import { AppSettings } from "../SettingsPanel";
import { THEME_LIST, ThemeStyle } from "../Theme";

export default function AppearanceSettings({ config, setConfig, activeTheme }: { config: AppSettings, setConfig: (c: AppSettings) => void, activeTheme: ThemeStyle }) {
  return (
    <div className={`border rounded-2xl p-6 space-y-6 transition-colors duration-500 ${activeTheme.isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
      <div className={`flex items-center gap-3 border-b pb-4 ${activeTheme.isDark ? 'border-white/10' : 'border-black/10'}`}>
        <div className="p-2 bg-pink-500/10 text-pink-500 rounded-lg"><Monitor size={20} /></div>
        <h3 className="text-md font-bold text-current">Appearance & Animation</h3>
      </div>

      {/* Theme Selector */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Palette size={16} className="opacity-50" />
          <label className="block text-sm font-semibold opacity-90">App Theme</label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {THEME_LIST.map((t) => (
            <button
              key={t.id}
              onClick={() => setConfig({ ...config, theme: t.id as any })}
              className={`flex flex-col items-center justify-center py-3 rounded-xl border-2 transition-all ${
                config.theme === t.id ? "border-pink-500 ring-2 ring-pink-500/20" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <div className={`w-full h-8 rounded-md border ${t.previewColor} mb-2 shadow-inner`} />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${activeTheme.isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Ring Scale */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className="block text-sm font-semibold opacity-90">Ring Scale ({config.ringScale}%)</label>
            <p className="text-xs opacity-60 mt-1">Adjust the overall size of the UI.</p>
          </div>
          <div className="text-sm font-bold text-pink-500 bg-pink-500/10 px-3 py-1 rounded-lg">x{config.ringScale / 100}</div>
        </div>
        <input
          type="range" min="50" max="150" step="5"
          value={config.ringScale}
          onChange={(e) => setConfig({ ...config, ringScale: parseInt(e.target.value) })}
          className={`w-full accent-pink-500 h-1.5 rounded-lg appearance-none cursor-pointer ${activeTheme.isDark ? 'bg-white/10' : 'bg-black/10'}`}
        />
        <div className="flex justify-between text-[10px] opacity-60 mt-2 font-semibold px-1">
          <span>Small (50%)</span>
          <span>Default (100%)</span>
          <span>Large (150%)</span>
        </div>
      </div>

      {/* Animation Speed */}
      <div className={`flex items-center justify-between pt-4 border-t ${activeTheme.isDark ? 'border-white/10' : 'border-black/10'}`}>
        <div>
          <label className="block text-sm font-semibold opacity-90">Summon Animation</label>
          <p className="text-xs opacity-60 mt-1 max-w-[200px]">How the ring appears.</p>
        </div>
        <div className={`grid grid-cols-2 gap-2 border rounded-xl p-1 ${activeTheme.isDark ? 'bg-black/40 border-white/10' : 'bg-white/60 border-black/10'}`}>
          {["instant", "fast", "smooth", "spring"].map((speed) => (
            <button
              key={speed}
              onClick={() => setConfig({ ...config, animSpeed: speed })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                config.animSpeed === speed 
                  ? (activeTheme.isDark ? "bg-white/20 text-white shadow-sm" : "bg-black/10 text-black shadow-sm font-bold") 
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              {speed}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}