import React, { useState } from 'react';
import { X, Heart, Coffee, QrCode, SearchCode } from 'lucide-react';
import { open } from '@tauri-apps/plugin-shell'; // ใช้สำหรับเปิดเว็บ BMAC
import buymeacoffee from "../../assets/buymeacoffee-qr.png";
import promptpay from "../../assets/promptpay-qr.jpg";

interface SupportProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: any;
}

const Support: React.FC<SupportProps> = ({ isOpen, onClose, currentTheme }) => {
    const [activeTab, setActiveTab] = useState<'promptpay' | 'bmac'>('promptpay');
    const [expandedImg, setExpandedImg] = useState<string | null>(null);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      {/* 💥 ส่วน Overlay สำหรับขยายรูป */}
        {expandedImg && (
        <div 
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md cursor-zoom-out animate-in fade-in duration-200"
            onClick={() => setExpandedImg(null)}
        >
            <div className="relative flex flex-col items-center gap-4">
            
            {/* 💥 แก้ตรงนี้: เอาความกว้าง/สูงตายตัวออก แล้วใส่ข้อจำกัดที่ตัวรูปแทน */}
            <img 
                src={expandedImg} 
                className="max-w-[90vw] max-h-[80vh] w-auto h-auto object-cover rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200 border-4 border-white/10"
                alt="Expanded QR"
            />

            <p className="text-white/60 text-[10px] font-black uppercase tracking-widest bg-black/40 px-6 py-2 rounded-full flex items-center gap-2 border border-white/5">
                <X size={14} /> Click anywhere to shrink
            </p>
            </div>
        </div>
        )}
      <div className={`relative w-full max-w-sm rounded-3xl border shadow-2xl overflow-hidden transition-all duration-500 ${currentTheme.panel} ${currentTheme.border}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-2">
            <Heart size={18} className="text-pink-500 fill-pink-500 animate-pulse" />
            <h3 className="font-bold tracking-tight text-current">Support OrbitKey</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-current transition-colors p-1 hover:bg-white/10 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Custom Tabs */}
        <div className="flex p-2 gap-2 bg-black/10 border-b border-white/5">
          <button
            onClick={() => setActiveTab('promptpay')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'promptpay' 
                ? 'bg-[#003D6B] text-white shadow-md' // สีน้ำเงิน PromptPay
                : 'text-zinc-500 hover:text-current hover:bg-white/5'
            }`}
          >
            <QrCode size={14} /> PromptPay
          </button>
          <button
            onClick={() => setActiveTab('bmac')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'bmac' 
                ? 'bg-[#FFDD00] text-black shadow-md' // สีเหลือง BMAC
                : 'text-zinc-500 hover:text-current hover:bg-white/5'
            }`}
          >
            <Coffee size={14} /> Buy Me a Coffee
          </button>
        </div>

        {/* Content Area */}
        <div className="p-8 flex flex-col items-center justify-center min-h-[320px] bg-black/5 duration-200">
          
          {/* Tab 1: PromptPay */}
          {activeTab === 'promptpay' && (
            <div className="flex flex-col items-center animate-in zoom-in-95 duration-300 space-y-6 w-full">
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-current">Scan to Donate</p>
                <p className="text-xs opacity-50">Support the developer directly via PromptPay (Thai Bank)</p>
              </div>
              
              {/* กรอบรูป QR Code PromptPay */}
              <div 
                className={`${currentTheme.border} group relative rounded-2xl shadow-xl w-80 flex items-center justify-center border cursor-zoom-in hover:scale-105 transition-transform`}
                onClick={() => setExpandedImg(promptpay)}
              >
                <img src={promptpay} alt="PromptPay QR" className="w-full h-full object-contain rounded-xl" />
                <div className="absolute bottom-4 right-4 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1 flex items-center justify-center">
                  <SearchCode className="text-white" size={24} />
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Buy Me a Coffee */}
          {activeTab === 'bmac' && (
            <div className="flex flex-col items-center animate-in zoom-in-95 duration-300 space-y-6 w-full">
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-current">Buy me a milktea 🧋</p>
                <p className="text-xs opacity-50">For international supporters</p>
              </div>

              {/* กรอบรูป QR Code BMAC */}
              <div 
                className="group relative p-3 bg-white rounded-2xl shadow-xl w-40 h-40 flex items-center justify-center cursor-zoom-in hover:scale-105 transition-transform"
                onClick={() => setExpandedImg(buymeacoffee)}
              >
                <img src={buymeacoffee} alt="Buy Me a Coffee QR" className="w-full h-full object-contain" />
                <div className="absolute bottom-4 right-4 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1 flex items-center justify-center">
                  <SearchCode className="text-white" size={24} />
                </div>
              </div>

              <button
                onClick={async () => await open('https://www.buymeacoffee.com/sonesambidev')}
                className="w-full py-3.5 rounded-xl bg-[#FFDD00] hover:bg-[#FFEA00] text-black font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-[#FFDD00]/20"
              >
                <Coffee size={18} /> Open in Browser
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Support;