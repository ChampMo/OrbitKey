// src/components/SplashScreen.tsx
import React from 'react';
import logo from "../../../src-tauri/icons/icon.png"

interface SplashScreenProps {
  theme: any;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ theme }) => {
  // 💥 สร้างตัวแปรดึงสีเด่น (Accent) ประจำธีม เพื่อเอาไปใช้กับวงแหวนและแถบโหลด
  const accentBg = theme.isDark ? 'bg-indigo-500' : 'bg-orange-500';
  const accentBorder = theme.isDark ? 'border-indigo-500' : 'border-orange-500';

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center ${theme.bg} transition-colors duration-700`}>
      
      {/* เอฟเฟกต์แสงฟุ้งด้านหลัง */}
      <div className={`absolute w-64 h-64 rounded-full blur-[100px] opacity-20 ${accentBg}`}></div>

      <div className="relative flex items-center justify-center">
        {/* 💥 วงแหวนหมุนรอบ Logo ปรับสีและเพิ่มความสว่าง (opacity) ให้เข้ากับธีม */}
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

      {/* 💥 Loading Bar ด้านล่าง */}
      {/* กรอบพื้นหลังใช้สีอักษรของธีม (theme.text + bg-current) เพื่อความกลมกลืน */}
      <div className={`absolute bottom-20 w-48 h-1 opacity-20 rounded-full overflow-hidden ${theme.text} bg-current`}>
        {/* ตัวเส้นวิ่ง ใช้สี Accent สีเดียวกับแสงฟุ้ง */}
        <div className={`h-full animate-progress-loading ${accentBg}`}></div>
      </div>
    </div>
  );
};

export default SplashScreen;