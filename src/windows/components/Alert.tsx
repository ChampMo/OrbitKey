import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { ThemeStyle } from '../Theme'; // 💥 ปรับ path ให้ตรงกับที่อยู่ของไฟล์ Theme.tsx ด้วยนะครับ

export interface AlertProps {
  isOpen: boolean;
  title?: string;
  message: string;
  type?: 'error' | 'success' | 'info';
  onClose: () => void;
  activeTheme: ThemeStyle;
}

export default function Alert({ isOpen, title, message, type = 'info', onClose, activeTheme }: AlertProps) {
  if (!isOpen) return null;

  // เลือกไอคอนและสีตามประเภทของ Alert
  const Icon = type === 'error' ? AlertCircle : type === 'success' ? CheckCircle2 : Info;
  
  const colorClass = 
    type === 'error' ? 'text-red-500 bg-red-500/10 border-red-500/20' :
    type === 'success' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' :
    'text-blue-500 bg-blue-500/10 border-blue-500/20';

  const btnColor = 
    type === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20 text-white' :
    type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20 text-white' :
    activeTheme.primaryBtn; // ถ้าเป็น info ธรรมดา ให้ใช้สีปุ่มหลักของธีม

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Box */}
      <div className={`relative w-full max-w-sm border shadow-2xl rounded-3xl p-6 animate-in zoom-in-95 duration-200 ${activeTheme.panel} ${activeTheme.border}`}>
        
        <div className="flex flex-col items-center text-center space-y-5">
          {/* Icon Box */}
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${colorClass}`}>
            <Icon size={32} />
          </div>
          
          {/* Text Area */}
          <div className="space-y-2">
            <h3 className={`text-lg font-bold ${activeTheme.text}`}>
              {title || (type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Information')}
            </h3>
            <p className={`text-sm opacity-70 leading-relaxed ${activeTheme.text}`}>
              {message}
            </p>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={onClose}
            className={`w-full py-3 mt-2 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center ${btnColor}`}
          >
            Okay
          </button>
        </div>

        {/* Close Corner */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 opacity-40 hover:opacity-100 transition-opacity"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}