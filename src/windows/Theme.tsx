/**
 * Theme.tsx — Master Theme Configuration
 */

export type ThemeId = "dark" | "ocean" | "matrix" | "light" | "peach" | "mint";

export interface ThemeStyle {
  id: ThemeId;
  label: string;
  bg: string;
  panel: string;
  text: string;
  border: string;
  isDark: boolean;
  previewColor: string; // Tailwind class สำหรับพื้นหลังกล่องพรีวิว
  accentColor: string;  // 🎨 สี Hex สำหรับแต้มมุมซ้ายล่าง และใช้กับจุดต่างๆ
  accentText: string;   // 💥 ใหม่: Tailwind class สำหรับสีตัวหนังสือที่เป็นจุดเด่น (เช่น ปุ่ม Import)
  primaryBtn: string;   // สีปุ่ม "+" ขวาล่าง
  ringColor: string;    // สีวงแหวนตอนถูกคลิก (Focus Ring)
  sliceBorder: string;  // สีขอบวงแหวนปกติ (Idle Border)
}

export const THEMES: Record<ThemeId, ThemeStyle> = {
  // 🌙 Dark Themes
  dark: { 
    id: "dark", label: "Cyber Dark", isDark: true, 
    bg: "bg-[#09090b]", panel: "bg-[#0c0c0e]", text: "text-zinc-100", border: "border-indigo-500/20",
    previewColor: "bg-zinc-950 border-zinc-800",
    accentColor: "#6366f1", 
    accentText: "text-indigo-400", // 💥 ดำม่วงแบบเดิม
    primaryBtn: "bg-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:bg-indigo-500",
    ringColor: "ring-indigo-500/50",
    sliceBorder: "border-indigo-500/10 hover:border-indigo-500/30"
  },
  ocean: { 
    id: "ocean", label: "Midnight Ocean", isDark: true, 
    bg: "bg-[#0B1120]", panel: "bg-[#0F172A]", text: "text-blue-100", border: "border-slate-800/80",
    previewColor: "bg-slate-900 border-slate-700",
    accentColor: "#3b82f6", 
    accentText: "text-blue-400",
    primaryBtn: "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:bg-blue-500",
    ringColor: "ring-blue-500/40",
    sliceBorder: "border-blue-300/10 hover:border-blue-300/30"
  },
  matrix: { 
    id: "matrix", label: "Neon Matrix", isDark: true, 
    bg: "bg-black", panel: "bg-[#021c0b]", text: "text-green-400", border: "border-green-900/50",
    previewColor: "bg-black border-green-900",
    accentColor: "#22c55e", 
    accentText: "text-green-400",
    primaryBtn: "bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:bg-green-400",
    ringColor: "ring-green-500/40",
    sliceBorder: "border-green-500/20 hover:border-green-500/40"
  },
  
  // ☀️ Light Themes
  light: { 
    id: "light", label: "Cloud Light", isDark: false, 
    bg: "bg-sky-50", panel: "bg-white", text: "text-sky-950", border: "border-sky-200/60",
    previewColor: "bg-white border-sky-300",
    accentColor: "#0ea5e9", 
    accentText: "text-sky-600",
    primaryBtn: "bg-sky-600 text-white shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:bg-sky-500",
    ringColor: "ring-sky-500/30",
    sliceBorder: "border-sky-500/10 hover:border-sky-500/30"
  },
  peach: { 
    id: "peach", label: "Peach Milk", isDark: false, 
    bg: "bg-orange-50", panel: "bg-orange-100/60", text: "text-orange-950", border: "border-orange-200",
    previewColor: "bg-orange-50 border-orange-200",
    accentColor: "#f97316", 
    accentText: "text-orange-600",
    primaryBtn: "bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:bg-orange-400",
    ringColor: "ring-orange-500/40",
    sliceBorder: "border-orange-900/10 hover:border-orange-900/20"
  },
  mint: { 
    id: "mint", label: "Mint Breeze", isDark: false, 
    bg: "bg-teal-50", panel: "bg-teal-100/60", text: "text-teal-950", border: "border-teal-200",
    previewColor: "bg-teal-50 border-teal-200",
    accentColor: "#10b981", 
    accentText: "text-teal-600",
    primaryBtn: "bg-teal-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-teal-500",
    ringColor: "ring-teal-600/40",
    sliceBorder: "border-teal-900/10 hover:border-teal-900/20"
  },
};

export const THEME_LIST = Object.values(THEMES);