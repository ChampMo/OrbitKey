
import { Download, Rocket, Info } from 'lucide-react';
import { relaunch } from '@tauri-apps/plugin-process';

export default function UpdateModal({ update, onClose, currentTheme }: any) {
  if (!update) return null;

  const handleUpdate = async () => {
    // เริ่มดาวน์โหลดและติดตั้ง
    await update.downloadAndInstall();
    // ติดตั้งเสร็จแล้วต้องรีสตาร์ทแอป
    await relaunch();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden transition-all duration-500 ${currentTheme.panel} ${currentTheme.border}`}>
        
        {/* Header - เปลี่ยน Gradient ให้ดึงสีมาจาก Theme */}
        <div 
          className="p-6 text-center space-y-3"
          style={{ backgroundImage: `linear-gradient(to bottom, ${currentTheme.accentColor}15, transparent)` }}
        >
          {/* กล่องไอคอนเปลี่ยนสีตาม Theme */}
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border transition-colors duration-500"
            style={{ 
              backgroundColor: `${currentTheme.accentColor}20`, 
              borderColor: `${currentTheme.accentColor}30` 
            }}
          >
            {/* ไอคอนจรวดเปลี่ยนสีตาม currentTheme.accentText */}
            <Rocket className={`${currentTheme.accentText} animate-bounce`} size={32} />
          </div>
          <div>
            <h2 className={`text-xl font-black tracking-tight ${currentTheme.text}`}>New Update Available!</h2>
            <p className={`text-xs opacity-50 font-bold uppercase tracking-widest ${currentTheme.text}`}>Version {update.version}</p>
          </div>
        </div>

        {/* Change Log */}
        <div className="px-8 py-4">
          <div className={`p-4 rounded-2xl border transition-colors duration-500 ${currentTheme.border} ${currentTheme.isDark ? 'bg-black/20' : 'bg-black/5'} space-y-2`}>
            <div className={`flex items-center gap-2 opacity-60 text-[10px] font-bold uppercase ${currentTheme.text}`}>
              <Info size={12} /> What's New:
            </div>
            <p className={`text-sm leading-relaxed opacity-90 whitespace-pre-wrap ${currentTheme.text}`}>
              {update.body || "No release notes provided."}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 flex flex-row justify-end gap-3">
          <button 
            onClick={onClose}
            className={`flex-1 px-8 py-3 text-xs font-bold opacity-50 hover:opacity-100 transition-opacity ${currentTheme.text}`}
          >
            Maybe Later
          </button>
          {/* ปุ่ม Update ดึงคลาส primaryBtn จาก Theme มาใช้ตรงๆ เลย */}
          <button 
            onClick={handleUpdate}
            className={`flex-[1.2] px-8 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 ${currentTheme.primaryBtn}`}
          >
            <Download size={16} /> Update Now
          </button>
        </div>
      </div>
    </div>
  );
}