// src/components/SplashScreen.tsx
import React, { useEffect, useState } from 'react';
import logo from "../../../src-tauri/icons/icon.png"

interface SplashScreenProps {
  theme: any;
  isReady: boolean;       
  onComplete: () => void; 
}

const SplashScreen: React.FC<SplashScreenProps> = ({ theme, isReady, onComplete }) => {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (isReady) {
      setIsFading(true); 
      const timer = setTimeout(() => {
        onComplete();
      }, 500); 
      return () => clearTimeout(timer);
    }
  }, [isReady, onComplete]);

  const accentBg = theme.isDark ? 'bg-indigo-500' : 'bg-orange-500';
  const accentBorder = theme.isDark ? 'border-indigo-500' : 'border-orange-500';

  return (
    // 💥 1. ชั้นนอกสุด: ล็อคสีพื้นหลัง (theme.bg) ให้ทึบ 100% เสมอ ห้ามเฟดตรงนี้เด็ดขาด
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center ${theme.bg}`}>
      
      {/* 💥 2. ชั้นใน: เราย้ายเอฟเฟกต์เฟดออก (opacity-0 / scale-105) มาไว้ที่เนื้อหาข้างในแทน */}
      <div className={`flex flex-col items-center justify-center w-full h-full transition-all duration-500 ease-in-out
        ${isFading ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'}
      `}>
        
        {/* เอฟเฟกต์แสงฟุ้งด้านหลัง */}
        <div className={`absolute w-64 h-64 rounded-full blur-[100px] opacity-20 ${accentBg}`}></div>

        <div className="relative flex items-center justify-center">
          {/* วงแหวนหมุนรอบ Logo */}
          <div className={`absolute w-24 h-24 border-2 border-dashed ${accentBorder} opacity-40 rounded-full animate-[spin_10s_linear_infinite]`}></div>
          
          {/* ตัว Logo */}
          <div className={`relative w-20 h-20 flex items-center justify-center rounded-xl shadow-2xl animate-bounce-slow`}>
            <img 
                  src={logo} 
                  className="w-auto h-auto object-cover"
                  alt="logo"
              />
          </div>
        </div>

        {/* ชื่อแอป */}
        <div className="mt-8 text-center">
          <h1 className={`text-3xl font-bold tracking-[0.2em] uppercase ${theme.text}`}>
            Orbit<span className={theme.accentText}>Key</span>
          </h1>
          <p className={`mt-2 text-[10px] font-medium tracking-[0.5em] uppercase opacity-40 ${theme.text}`}>
            Unlock your workflow
          </p>
        </div>

        {/* Loading Bar ด้านล่าง */}
        <div className={`absolute bottom-20 w-48 h-1 opacity-20 rounded-full overflow-hidden ${theme.text} bg-current`}>
          <div className={`h-full animate-progress-loading ${accentBg}`}></div>
        </div>

      </div>
    </div>
  );
};

export default SplashScreen;