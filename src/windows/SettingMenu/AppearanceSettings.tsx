
import { Monitor } from "lucide-react";
import { AppSettings } from "../SettingsPanel";

export default function AppearanceSettings({ config, setConfig }: { config: AppSettings, setConfig: (c: AppSettings) => void }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
        <div className="p-2 bg-pink-500/10 text-pink-400 rounded-lg"><Monitor size={20} /></div>
        <h3 className="text-md font-bold text-white">Appearance & Animation</h3>
      </div>

      {/* Ring Scale */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className="block text-sm font-semibold text-zinc-200">Ring Scale ({config.ringScale}%)</label>
            <p className="text-xs text-zinc-500 mt-1">Adjust the overall size of the UI.</p>
          </div>
          <div className="text-sm font-bold text-pink-400 bg-pink-500/10 px-3 py-1 rounded-lg">x{config.ringScale / 100}</div>
        </div>
        <input
          type="range" min="50" max="150" step="5"
          value={config.ringScale}
          onChange={(e) => setConfig({ ...config, ringScale: parseInt(e.target.value) })}
          className="w-full accent-pink-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-zinc-600 mt-2 font-semibold px-1">
          <span>Small (50%)</span>
          <span>Default (100%)</span>
          <span>Large (150%)</span>
        </div>
      </div>

      {/* Animation Speed */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
        <div>
          <label className="block text-sm font-semibold text-zinc-200">Summon Animation</label>
          <p className="text-xs text-zinc-500 mt-1 max-w-[200px]">How the ring appears.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-1">
          {["instant", "fast", "smooth", "spring"].map((speed) => (
            <button
              key={speed}
              onClick={() => setConfig({ ...config, animSpeed: speed })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                config.animSpeed === speed ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
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