import { Lightbulb, X, MousePointer2, Settings2, Zap } from "lucide-react";
import tip1 from "../../assets/tip-1.jpg";
import tip2 from "../../assets/tip-2.png";
import tip3 from "../../assets/tip-3.mp4";
// 💥 นำเข้า ThemeStyle
import { ThemeStyle } from "../Theme"; 

interface ProTipModalProps {
  onClose: () => void;
  activeTheme: ThemeStyle; // 💥 รับ Props Theme
}

export default function ProTipModal({ onClose, activeTheme }: ProTipModalProps) {
  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`${activeTheme.panel} border ${activeTheme.border} text-current rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 transition-colors`}
      >
        
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${activeTheme.border} ${activeTheme.isDark ? 'bg-white/5' : 'bg-black/5'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-xl"><Lightbulb size={24} /></div>
            <h2 className="text-xl font-bold">Unlock True Speed</h2>
          </div>
          <button onClick={onClose} className={`p-2 opacity-50 hover:opacity-100 rounded-full transition-all ${activeTheme.isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className={`flex flex-col md:flex-row p-8 gap-10 ${activeTheme.isDark ? 'bg-black/20' : 'bg-black/5'}`}>
          
          {/* ฝั่งซ้าย: รูปภาพ 3 รูป */}
          <div className="w-full md:w-[40%] flex flex-col gap-4 relative">
            <div className={`group w-4/5 aspect-[4/3] ${activeTheme.bg} border ${activeTheme.border} rounded-2xl relative z-10 overflow-hidden shadow-xl transition-transform hover:scale-105`}>
              <img src={tip1} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className={`absolute inset-0 bg-gradient-to-t ${activeTheme.isDark ? 'from-[#0c0c0e]/50' : 'from-white/50'} to-transparent`} />
            </div>

            {/* รูปที่ 2 */}
            <div className={`group w-4/5 aspect-[4/3] ${activeTheme.bg} border ${activeTheme.border} rounded-2xl self-end relative z-20 -mt-12 overflow-hidden shadow-xl transition-transform hover:scale-105`}>
               <img src={tip2} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
               <div className={`absolute inset-0 bg-gradient-to-t ${activeTheme.isDark ? 'from-[#0c0c0e]/50' : 'from-white/50'} to-transparent`} />
            </div>

            {/* รูปที่ 3 */}
            <div className={`group w-4/5 aspect-[4/3] ${activeTheme.bg} border ${activeTheme.border} rounded-2xl relative z-30 -mt-12 overflow-hidden shadow-xl transition-transform hover:scale-105`}>
              <video 
                src={tip3} 
                autoPlay loop muted playsInline 
                className="w-full h-full object-cover opacity-90"
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-current opacity-10 rounded-2xl" />
            </div>
          </div>

          {/* ฝั่งขวา: คำอธิบายและขั้นตอน */}
          <div className="w-full md:w-[60%] flex flex-col justify-center space-y-6">
            <div>
              <h3 className="text-3xl font-extrabold mb-4 leading-tight">
                Map to your <span className={activeTheme.isDark ? "text-indigo-400" : "text-indigo-600"}>Side Buttons</span>
              </h3>
              <p className="opacity-70 leading-relaxed text-lg">
                For the ultimate seamless experience, we highly recommend mapping your Action Ring global hotkey to the extra side buttons on your gaming or productivity mouse.
              </p>
            </div>

            <div className="space-y-4 mt-4">
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl shrink-0 ${activeTheme.isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}><Settings2 size={20} /></div>
                <div>
                  <h4 className="font-bold mb-1">1. Set a Complex Hotkey</h4>
                  <p className="text-sm opacity-60">Set a hotkey in the app that you don't normally type (e.g., <code className={`px-1.5 py-0.5 rounded font-mono font-bold ${activeTheme.isDark ? 'bg-white/10 text-indigo-300' : 'bg-black/5 text-indigo-600'}`}>Ctrl+Shift+Alt+Q</code>).</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl shrink-0 ${activeTheme.isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}><MousePointer2 size={20} /></div>
                <div>
                  <h4 className="font-bold mb-1">2. Open Mouse Software</h4>
                  <p className="text-sm opacity-60">Open your mouse driver (Logitech G HUB, Razer Synapse, etc.) and select a side button.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl shrink-0 ${activeTheme.isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}><Zap size={20} /></div>
                <div>
                  <h4 className="font-bold mb-1">3. Assign the Macro</h4>
                  <p className="text-sm opacity-60">Assign the "Keyboard Shortcut" you created in step 1 to that mouse button. Done!</p>
                </div>
              </div>
            </div>

            {/* 💥 ใช้สีปุ่มหลักจาก Theme 💥 */}
            <button onClick={onClose} className={`mt-8 py-3 w-full font-bold rounded-xl transition-all active:scale-95 ${activeTheme.primaryBtn}`}>
              Got it!
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}