import React from "react";
import { HardDrive, Power, Download, Upload, AlertTriangle } from "lucide-react";
import { AppSettings } from "../SettingsPanel";

export default function SystemDataSettings({ config, setConfig }: { config: AppSettings, setConfig: (c: AppSettings) => void }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
        <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><HardDrive size={20} /></div>
        <h3 className="text-md font-bold text-white">System & Data</h3>
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
          <button className="flex items-center justify-center gap-2 py-2.5 bg-zinc-950 border border-zinc-700 hover:bg-zinc-800 rounded-xl text-sm font-semibold text-zinc-300 transition-all opacity-50 cursor-not-allowed" title="Coming soon">
            <Download size={16} /> Export All
          </button>
          <button className="flex items-center justify-center gap-2 py-2.5 bg-zinc-950 border border-zinc-700 hover:bg-zinc-800 rounded-xl text-sm font-semibold text-zinc-300 transition-all opacity-50 cursor-not-allowed" title="Coming soon">
            <Upload size={16} /> Import All
          </button>
        </div>
        <button className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-sm font-semibold text-red-500 transition-all opacity-50 cursor-not-allowed" title="Coming soon">
          <AlertTriangle size={16} /> Factory Reset
        </button>
      </div>
    </div>
  );
}