/**
 * ActionRing.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Perfect Centering & Smart Hybrid Release Mode
 */

import React, { useCallback, useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import * as LucideIcons from "lucide-react";

interface ApiSlice { id: string; label: string; icon?: string; color?: string; actionType: string; actionData?: string | null; scriptArgs?: string[]; children?: ApiSlice[] | null; }
interface ApiProfile { id: string; slices: ApiSlice[]; isDefault: boolean; }
interface AppSettings { globalHotkey: string; startWithOS: boolean; ringScale: number; closeAfterExec: boolean; triggerMode: string; animSpeed: string; deadzone: number; centerAction: string; }

export default function ActionRing() {
  const [slices, setSlices] = useState<ApiSlice[]>([]);
  const [config, setConfig] = useState<AppSettings | null>(null);
  const [animKey, setAnimKey] = useState(0);
  
  // 💥 แก้ปัญหาที่ 2: ล็อกศูนย์กลางที่ 400,400 ไปเลย ไม่ต้องคำนวณให้มั่ว!
  const [center, setCenter] = useState({ x: -1000, y: -1000 });
  const [isVisible, setIsVisible] = useState(false); 

  const [hoveredMainId, setHoveredMainId] = useState<string | null>(null);
  const [hoveredChildId, setHoveredChildId] = useState<string | null>(null);
  const [clickedId, setClickedId] = useState<string | null>(null);

  const slicesRef = useRef<ApiSlice[]>([]);
  const configRef = useRef<AppSettings | null>(null);
  const hoveredMainRef = useRef<string | null>(null);
  const hoveredChildRef = useRef<string | null>(null);
  
  // 💥 ตัวแปรเก็บเวลาตอนเรียกวงแหวน (แก้ปัญหาข้อ 3)
  const summonTimeRef = useRef<number>(0);

  useEffect(() => { slicesRef.current = slices; }, [slices]);
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { hoveredMainRef.current = hoveredMainId; }, [hoveredMainId]);
  useEffect(() => { hoveredChildRef.current = hoveredChildId; }, [hoveredChildId]);

  const scaleMult = (config?.ringScale || 100) / 100;
  const R_MAIN = 90 * scaleMult;
  const R_OUTER = 180 * scaleMult;
  const NODE_SIZE = 50 * scaleMult;
  const NODE_SIZE_HOV = 60 * scaleMult;
  const NODE_SIZE_CHILD = 50 * scaleMult;
  const NODE_SIZE_CHILD_HOV = 60 * scaleMult;
  const DEAD_ZONE = config?.deadzone || 30;

  // ค้นหาส่วนที่คำนวณ animClass ใน ActionRing.tsx แล้ววางทับครับ

  let animClass = "";
  let initialScale = "scale-100";

  switch (config?.animSpeed) {
    case "instant":
      // ⚡️ มาทันที: ไม่มี Animation โผล่ปุ๊บมาปั๊บ
      animClass = "opacity-100 transition-none";
      break;

    case "fast":
      // 🏎️ สายซิ่ง: Fade in สั้นๆ + ขยายจาก 90% มา 100% (ดูคมและไว)
      animClass = isVisible 
        ? "opacity-100 scale-100 transition-all duration-150 ease-out" 
        : "opacity-0 scale-90 transition-none";
      break;

    case "smooth":
      // 🌊 สายละมุน: Fade in ช้าๆ + Blur เล็กน้อย + ขยายจาก 70% (ดูหรูหรา)
      animClass = isVisible 
        ? "opacity-100 scale-100 blur-0 transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)" 
        : "opacity-0 scale-75 blur-md transition-none";
      break;

    case "spring":
      // 🎾 สายเด้ง: ใช้ Keyframe ที่เราสร้างไว้ (เด้งดึ๋งแบบ Apple UI)
      animClass = isVisible 
        ? "animate-spring-custom" 
        : "opacity-0 scale-50 transition-none";
      break;

    default:
      animClass = isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95";
  }

  const loadData = async () => {
    try {
      const [profiles, settings] = await Promise.all([
        invoke<ApiProfile[]>("get_profiles").catch(() => null),
        invoke<AppSettings>("get_settings").catch(() => null)
      ]);
      if (profiles && profiles.length > 0) {
        const activeProfile = profiles.find((p) => p.isDefault) || profiles[0];
        setSlices(activeProfile.slices);
      }
      if (settings) setConfig(settings);
    } catch (err) { console.error(err); }
  };

  // ─── ฟังก์ชัน Execute ───
  const executeAction = async (mainId: string | null, childId: string | null) => {
    const currentSlices = slicesRef.current;
    const currentConfig = configRef.current;
    
    let targetSlice: ApiSlice | null = null;
    if (childId && mainId) {
      targetSlice = currentSlices.find(s => s.id === mainId)?.children?.find(c => c.id === childId) || null;
    } else if (mainId) {
      targetSlice = currentSlices.find(s => s.id === mainId) || null;
    }

    // 1. กรณีคลิกโดนปุ่มที่มีคำสั่ง (ไม่ใช่ Folder)
    if (targetSlice && targetSlice.actionType !== "folder") {
      setClickedId(targetSlice.id);
      
      // --- DEBUG LOG ---
      console.log("🎯 Action Triggered:", targetSlice.label);
      console.log("Settings Found:", !!currentConfig);
      console.log("Close After Exec Setting:", currentConfig?.closeAfterExec);

      // ✅ แก้ Logic ตรงนี้: ต้องมั่นใจว่า Config โหลดมาแล้ว และเป็น True เท่านั้นถึงจะปิด
      if (currentConfig && currentConfig.closeAfterExec === true) {
        console.log("🎬 ActionRing: Closing window because setting is TRUE");
        await invoke("hide_action_ring").catch(console.error);
      } else {
        console.log("⏸️ ActionRing: Staying open because setting is FALSE or undefined");
      }
      
      // ส่งไปรันคำสั่งที่ Rust
      invoke("execute_action", { action: targetSlice }).catch((err) => {
         console.error("Rust Execute Error:", err);
      });
      
    } 
    // 2. กรณีคลิกที่ว่าง หรือคลิกโดน X ตรงกลาง
    else if (!targetSlice || (targetSlice.actionType !== "folder" && !mainId)) {
      console.log("🌑 ActionRing: Closing window because background/center was clicked");
      invoke("hide_action_ring").catch(console.error);
    }
  };

  useEffect(() => {
    loadData();
    const unlistenShow = listen("ring:show", () => {
      setIsVisible(false);
      loadData();
      setHoveredMainId(null); setHoveredChildId(null); setClickedId(null);
      
      // บันทึกเวลาที่เรียกวงแหวนขึ้นมา
      summonTimeRef.current = Date.now();
      
      // 💥 แก้ปัญหาที่ 2: วางพิกัดกึ่งกลางที่ 400, 400 เสมอ!
      setCenter({ x: 400, y: 400 });
      setAnimKey(k => k + 1);
      
      requestAnimationFrame(() => setIsVisible(true));
    });

    const unlistenHide = listen("ring:hide", () => {
      setIsVisible(false);
      setCenter({ x: -1000, y: -1000 }); 
      setHoveredMainId(null); setHoveredChildId(null);
    });

    const unlistenKeyReleased = listen("ring:key_released", () => {
      // 💥 แก้ปัญหาที่ 3: Hybrid Release Mode
      const holdDuration = Date.now() - summonTimeRef.current;
      
      // ถ้าระยะเวลาที่กดปุ่มน้อยกว่า 200ms แปลว่าผู้ใช้ตั้งใจ "กด Tap" ให้เปิดค้างไว้ ไม่ต้องทำอะไร
      if (holdDuration < 200) {
        return; 
      }

      // แต่ถ้ากดค้างเกิน 200ms แปลว่าตั้งใจใช้โหมด Release ให้รันคำสั่งเลย
      if (configRef.current?.triggerMode === "release") {
        executeAction(hoveredMainRef.current, hoveredChildRef.current);
      }
    });

    return () => {
      unlistenShow.then(f => f()); unlistenHide.then(f => f()); unlistenKeyReleased.then(f => f());
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") invoke("hide_action_ring").catch(console.error);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (clickedId !== null || !isVisible) return;
      const dx = e.clientX - center.x; const dy = e.clientY - center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      if (dist < DEAD_ZONE) {
        setHoveredMainId(null); setHoveredChildId(null); return;
      }

      if (hoveredMainId && dist > R_MAIN + (40 * scaleMult)) {
        const folder = slices.find(s => s.id === hoveredMainId);
        if (folder?.children && folder.children.length > 0) {
          const folderIdx = slices.findIndex(s => s.id === hoveredMainId);
          const parentAngle = -Math.PI / 2 + (folderIdx * 2 * Math.PI) / slices.length;
          const step = Math.PI / 6.5;
          const startAngle = parentAngle - ((folder.children.length - 1) * step) / 2;

          let closestIdx = -1; let minDiff = Infinity;
          folder.children.forEach((_, i) => {
            const childAngle = startAngle + i * step;
            const diff = Math.abs(Math.atan2(Math.sin(angle - childAngle), Math.cos(angle - childAngle)));
            if (diff < minDiff) { minDiff = diff; closestIdx = i; }
          });
          if (minDiff < step / 1.5) { setHoveredChildId(folder.children[closestIdx].id); return; }
        }
      }

      if (slices.length > 0 && dist <= R_MAIN + (45 * scaleMult)) {
        setHoveredChildId(null);
        const step = (2 * Math.PI) / slices.length;
        const origin = -Math.PI / 2 - step / 2;
        const normalised = (((angle - origin) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const idx = Math.min(Math.floor(normalised / step), slices.length - 1);
        setHoveredMainId(slices[idx].id);
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [slices, hoveredMainId, clickedId, center, isVisible, DEAD_ZONE, R_MAIN, scaleMult]);

  const handleClick = useCallback(() => {
    if (config?.triggerMode !== "release") {
      executeAction(hoveredMainId, hoveredChildId);
    } else {
      if (!hoveredMainId && !hoveredChildId) {
        invoke("hide_action_ring").catch(console.error);
      }
    }
  }, [hoveredMainId, hoveredChildId, config]);

  return (
    <div className="absolute inset-0 w-[800px] h-[800px] select-none overflow-hidden" style={{ background: "transparent" }} onClick={handleClick}>
      <div key={animKey} className={`w-full h-full relative ${isVisible ? `opacity-100 ${animClass}` : "opacity-0 transition-none duration-0"}`}>
        
        <div className="absolute flex items-center justify-center rounded-full bg-zinc-900/80 border border-white/10"
             style={{ width: 46 * scaleMult, height: 46 * scaleMult, left: center.x, top: center.y, transform: "translate(-50%, -50%)", zIndex: 10 }}>
          <LucideIcons.X size={24 * scaleMult} strokeWidth={3} className="text-red-500" />
        </div>

        // ในส่วนการ map() เพื่อแสดงผล Slices (ประมาณบรรทัด 160+)
        {slices.map((slice, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / slices.length;
          const animType = config?.animSpeed || "spring"; // ดึงค่าจาก Setting มา

          // 1. คำนวณพิกัดเป้าหมาย (พิกัดจริงบนวงกลม)
          const targetX = center.x + R_MAIN * Math.cos(angle);
          const targetY = center.y + R_MAIN * Math.sin(angle);

          // 2. ปรับ Logic พิกัด nx, ny ตามโหมด
          let nx, ny;
          if (animType === "spring") {
            // 🎾 โหมด Spring: วิ่งจากกลาง (center) ออกไปหาเป้าหมาย (target)
            nx = isVisible ? targetX : center.x;
            ny = isVisible ? targetY : center.y;
          } else {
            // ⚡️ โหมดอื่นๆ: อยู่ที่พิกัดเป้าหมายเลย แล้วใช้การ Fade/Scale เอา
            nx = targetX;
            ny = targetY;
          }

          // 3. กำหนดความเร็วและจังหวะ (Transition) ตามโหมด
          let itemTransition = "";
          if (animType === "instant") itemTransition = "none";
          if (animType === "fast")    itemTransition = "all 0.15s ease-out";
          if (animType === "smooth")  itemTransition = "all 0.3s ease-in-out";
          if (animType === "spring")  itemTransition = "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";

          const active = hoveredMainId === slice.id;
          const isClicked = clickedId === slice.id;
          const Icon = (LucideIcons as any)[slice.icon || "Zap"] || LucideIcons.Zap;
          const size = isClicked ? NODE_SIZE - (10 * scaleMult) : active ? NODE_SIZE_HOV : NODE_SIZE;

          return (
            <div 
              key={slice.id} 
              className="absolute flex items-center justify-center rounded-full shadow-xl"
              style={{ 
                width: size, 
                height: size, 
                left: nx, 
                top: ny, 
                // การขยาย: Instant จะโผล่เลย, โหมดอื่นจะค่อยๆ ขยาย
                transform: `translate(-50%, -50%) scale(${isVisible ? 1 : animType === 'instant' ? 1 : 0})`,
                opacity: isVisible ? (clickedId !== null && clickedId !== slice.id ? 0.2 : 1) : 0,
                backgroundColor: active ? (slice.color || "#6366f1") : "#C8C8D2", 
                color: active ? "white" : "#18181b",
                zIndex: active ? 30 : 20,
                
                // ✨ ใช้ตัวแปรที่เราคำนวณไว้ข้างบน
                transition: itemTransition,
                
                // ✨ ใส่ Delay เฉพาะโหมด Spring เท่านั้น โหมดอื่นให้มาพร้อมกัน
                transitionDelay: (isVisible && animType === "spring") ? `${i * 30}ms` : "0ms", 
              }}
            >
              <Icon size={active ? 28 * scaleMult : 22 * scaleMult} strokeWidth={active ? 2.5 : 3} />
              
              {/* ส่วน Label */}
              {active && !hoveredChildId && (
                <div className="absolute top-[-45px] left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white text-zinc-900 font-bold rounded-full shadow-2xl whitespace-nowrap">
                  {slice.label}
                </div>
              )}
            </div>
          );
        })}
        {hoveredMainId && slices.find(s => s.id === hoveredMainId)?.actionType === 'folder' && (() => {
           const folder = slices.find(s => s.id === hoveredMainId)!;
           const children = folder.children || [];
           const folderIdx = slices.findIndex(s => s.id === hoveredMainId);
           const parentAngle = -Math.PI / 2 + (folderIdx * 2 * Math.PI) / slices.length;
           const step = Math.PI / 6.5;
           const startAngle = parentAngle - ((children.length - 1) * step) / 2;

           return children.map((child, i) => {
              const angle = startAngle + i * step;
              const nx = center.x + R_OUTER * Math.cos(angle);
              const ny = center.y + R_OUTER * Math.sin(angle);
              const active = hoveredChildId === child.id;
              const isClicked = clickedId === child.id;
              const Icon = (LucideIcons as any)[child.icon || "Zap"] || LucideIcons.Zap;
              const size = isClicked ? NODE_SIZE_CHILD - (10 * scaleMult) : active ? NODE_SIZE_CHILD_HOV : NODE_SIZE_CHILD;

              return (
                <div key={child.id} style={{ opacity: clickedId !== null && clickedId !== child.id ? 0.2 : 1, transition: "opacity 0.2s" }}>
                  <div className={`absolute flex items-center justify-center rounded-full shadow-lg transition-all duration-200 z-30 ${active ? "ring-4 ring-white/30" : ""}`}
                       style={{ width: size, height: size, left: nx, top: ny, transform: "translate(-50%, -50%)",
                                backgroundColor: active ? (child.color || "#6366f1") : "#E4E4EB", color: active ? "white" : "#3f3f46" }}>
                    <Icon size={active ? 26 * scaleMult : 20 * scaleMult} strokeWidth={active ? 2.5 : 3} />
                  </div>
                  {active && (
                    <div className="absolute px-3 py-1 bg-white text-zinc-900 font-bold rounded-full shadow-2xl whitespace-nowrap"
                         style={{ left: center.x + (R_OUTER + 55 * scaleMult) * Math.cos(angle), top: center.y + (R_OUTER + 55 * scaleMult) * Math.sin(angle), transform: "translate(-50%, -50%)", fontSize: `${10 * scaleMult}px` }}>
                      {child.label}
                    </div>
                  )}
                </div>
              );
           });
        })()}
      </div>
    </div>
  );
}