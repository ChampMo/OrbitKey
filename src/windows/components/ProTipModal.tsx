
import { Lightbulb, X, MousePointer2, Settings2, Zap } from "lucide-react";
import tip1 from "../../assets/tip-1.jpg";
import tip2 from "../../assets/tip-2.png";
import tip3 from "../../assets/tip-3.mp4";


interface ProTipModalProps {
  onClose: () => void;
}

export default function ProTipModal({ onClose }: ProTipModalProps) {
  return (
    <div 
    onClick={onClose}
    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
      onClick={(e) => e.stopPropagation()}
      className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800/50 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-xl"><Lightbulb size={24} /></div>
            <h2 className="text-xl font-bold text-white">Unlock True Speed</h2>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Body (แบ่งซ้าย-ขวา) */}
        <div className="flex flex-col md:flex-row p-8 gap-10 bg-zinc-900/30">
          
          {/* ฝั่งซ้าย: รูปภาพ 3 รูป */}
          <div className="w-full md:w-[40%] flex flex-col gap-4 relative">
            <div className="group w-4/5 aspect-[4/3] bg-zinc-950 border border-zinc-800 rounded-2xl relative z-10 overflow-hidden shadow-2xl transition-transform hover:scale-105">
            <img src={tip1} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/50 to-transparent" />
          </div>

          {/* รูปที่ 2: การแมปปุ่ม (เยื้องขวา) */}
          <div className="group w-4/5 aspect-[4/3] bg-zinc-950 border border-zinc-800 rounded-2xl self-end relative z-20 -mt-12 overflow-hidden shadow-2xl transition-transform hover:scale-105">
             <img src={tip2} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
             <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/50 to-transparent" />
          </div>

          {/* รูปที่ 3: วงแหวน (ถ้าเป็นวิดีโอ MP4) */}
          <div className="group w-4/5 aspect-[4/3] bg-zinc-950 border border-zinc-800 rounded-2xl relative z-30 -mt-12 overflow-hidden shadow-2xl transition-transform hover:scale-105">
            <video 
              src={tip3} 
              autoPlay loop muted playsInline 
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl" />
          </div>
          </div>

          {/* ฝั่งขวา: คำอธิบายและขั้นตอน */}
          <div className="w-full md:w-[60%] flex flex-col justify-center space-y-6">
            <div>
              <h3 className="text-3xl font-extrabold text-white mb-4 leading-tight">
                Map to your <span className="text-indigo-400">Side Buttons</span>
              </h3>
              <p className="text-zinc-400 leading-relaxed text-lg">
                For the ultimate seamless experience, we highly recommend mapping your Action Ring global hotkey to the extra side buttons on your gaming or productivity mouse.
              </p>
            </div>

            <div className="space-y-4 mt-4">
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-zinc-800 text-zinc-300 rounded-xl shrink-0"><Settings2 size={20} /></div>
                <div>
                  <h4 className="text-white font-bold mb-1">1. Set a Complex Hotkey</h4>
                  <p className="text-sm text-zinc-500">Set a hotkey in the app that you don't normally type (e.g., <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-indigo-300">Ctrl+Shift+Alt+Q</code>).</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-zinc-800 text-zinc-300 rounded-xl shrink-0"><MousePointer2 size={20} /></div>
                <div>
                  <h4 className="text-white font-bold mb-1">2. Open Mouse Software</h4>
                  <p className="text-sm text-zinc-500">Open your mouse driver (Logitech G HUB, Razer Synapse, etc.) and select a side button.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-zinc-800 text-zinc-300 rounded-xl shrink-0"><Zap size={20} /></div>
                <div>
                  <h4 className="text-white font-bold mb-1">3. Assign the Macro</h4>
                  <p className="text-sm text-zinc-500">Assign the "Keyboard Shortcut" you created in step 1 to that mouse button. Done!</p>
                </div>
              </div>
            </div>

            <button onClick={onClose} className="mt-8 py-3 w-full bg-white hover:bg-zinc-200 text-zinc-900 font-bold rounded-xl transition-colors">
              Got it!
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}