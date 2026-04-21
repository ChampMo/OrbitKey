import React from "react";
import { ArrowLeft, Settings } from "lucide-react";

export default function SettingsPanel({ onBack }: { onBack: () => void }) {
  return (
    <div className="absolute inset-0 w-full h-full flex flex-col bg-[#09090b] text-zinc-100 overflow-hidden font-sans">
      {/* HEADER */}
      <header className="shrink-0 flex items-center px-8 py-5 bg-[#0c0c0e] border-b border-zinc-800/60 shadow-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-zinc-300 hover:text-white rounded-xl text-sm font-semibold transition-all mr-4"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">Program Settings</h2>
        </div>
      </header>

      {/* BODY */}
      <main className="flex-1 p-10 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-md font-bold text-white mb-4">
              General Settings
            </h3>
            <p className="text-zinc-400 text-sm">
              (หน้าตั้งค่าแอปพลิเคชัน เดี๋ยวเราจะมาเพิ่มเมนูอื่นๆ ตรงนี้ครับ...)
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
