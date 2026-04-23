/**
 * ActionRing.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Perfect Centering & Smart Hybrid Release Mode + Temporary Profile Switch + Folder Chevron
 */

import { useCallback, useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import * as LucideIcons from "lucide-react";
import { ThemeId } from "./Theme";

interface ApiSlice { id: string; label: string; icon?: string; color?: string; actionType: string; actionData?: string | null; scriptArgs?: string[]; children?: ApiSlice[] | null; }
interface ApiProfile { id: string; name: string; slices: ApiSlice[]; isDefault: boolean; }
interface AppSettings { 
  globalHotkey: string; 
  startWithOS: boolean; 
  ringScale: number; 
  closeAfterExec: boolean; 
  triggerMode: string; 
  animSpeed: string; 
  deadzone: number; 
  centerAction: string; 
  theme: ThemeId;}

export default function ActionRing() {
  const [allProfiles, setAllProfiles] = useState<ApiProfile[]>([]);
  const [tempProfileId, setTempProfileId] = useState<string | null>(null);
  
  const [slices, setSlices] = useState<ApiSlice[]>([]);
  const [config, setConfig] = useState<AppSettings | null>(null);
  const [animKey, setAnimKey] = useState(0);
  
  const [center, setCenter] = useState({ x: -1000, y: -1000 });
  const [isVisible, setIsVisible] = useState(false); 

  const [hoveredMainId, setHoveredMainId] = useState<string | null>(null);
  const [hoveredChildId, setHoveredChildId] = useState<string | null>(null);
  const [clickedId, setClickedId] = useState<string | null>(null);

  const slicesRef = useRef<ApiSlice[]>([]);
  const configRef = useRef<AppSettings | null>(null);
  const hoveredMainRef = useRef<string | null>(null);
  const hoveredChildRef = useRef<string | null>(null);
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

  let animClass = "";
  switch (config?.animSpeed) {
    case "instant": animClass = "opacity-100 transition-none"; break;
    case "fast": animClass = isVisible ? "opacity-100 scale-100 transition-all duration-150 ease-out" : "opacity-0 scale-90 transition-none"; break;
    case "smooth": animClass = isVisible ? "opacity-100 scale-100 blur-0 transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)" : "opacity-0 scale-75 blur-md transition-none"; break;
    case "spring": animClass = isVisible ? "animate-spring-custom" : "opacity-0 scale-50 transition-none"; break;
    default: animClass = isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95";
  }

  const loadData = async () => {
    try {
      const [profiles, settings] = await Promise.all([
        invoke<ApiProfile[]>("get_profiles").catch(() => null),
        invoke<AppSettings>("get_settings").catch(() => null)
      ]);
      if (profiles && profiles.length > 0) {
        setAllProfiles(profiles);
      }
      if (settings) setConfig(settings);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (allProfiles.length === 0) return;
    const active = tempProfileId 
      ? allProfiles.find(p => p.id === tempProfileId) 
      : allProfiles.find(p => p.isDefault);
    setSlices(active?.slices || allProfiles[0].slices);
  }, [allProfiles, tempProfileId]);

  const executeAction = async (mainId: string | null, childId: string | null) => {
    const currentSlices = slicesRef.current;
    const currentConfig = configRef.current as any; 
    
    let targetSlice: ApiSlice | null = null;
    if (childId && mainId) {
      targetSlice = currentSlices.find(s => s.id === mainId)?.children?.find(c => c.id === childId) || null;
    } else if (mainId) {
      targetSlice = currentSlices.find(s => s.id === mainId) || null;
    }

    if (targetSlice && targetSlice.actionType !== "folder") {
      setClickedId(targetSlice.id);
      
      const isReleaseMode = currentConfig?.triggerMode === "release" || currentConfig?.trigger_mode === "release";
      const settingClose = currentConfig?.closeAfterExec === true || currentConfig?.close_after_exec === true;

      const isSwitchProfile = targetSlice.actionType === "switch_profile";
      const shouldClose = !isSwitchProfile && (isReleaseMode || settingClose);

      if (shouldClose) {
        console.log("🎬 ActionRing: Closing window");
        await invoke("hide_action_ring").catch(console.error);
      } else {
        setTimeout(() => { setClickedId(null); }, 150);
      }
      
      let permissionGranted = false;
      try {
        permissionGranted = await isPermissionGranted();
        if (!permissionGranted) {
          const permission = await requestPermission();
          permissionGranted = permission === 'granted';
        }
      } catch (e) {
        console.warn("Notification error:", e);
      }

      const shouldNotify = targetSlice.actionType === "multi_action" || targetSlice.actionType === "script";

      if (permissionGranted && shouldNotify) {
        sendNotification({
          title: 'Action Ring',
          body: `⏳ Starting: ${targetSlice.label}...`
        });
      }

      try {
        await invoke("execute_action", { action: targetSlice });
        if (permissionGranted && shouldNotify) {
          sendNotification({
            title: 'Action Ring',
            body: `✅ Executed: ${targetSlice.label}`
          });
        }
      } catch (err) {
        console.error("Rust Execute Error:", err);
        if (permissionGranted) {
          sendNotification({
            title: 'Action Ring Error',
            body: `❌ Failed: ${targetSlice.label}`
          });
        }
      }
      
    } else if (!targetSlice || (targetSlice.actionType !== "folder" && !mainId)) {
      const isReleaseMode = currentConfig?.triggerMode === "release" || currentConfig?.trigger_mode === "release";
      if (isReleaseMode || !mainId) {
        invoke("hide_action_ring").catch(console.error);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  };

  useEffect(() => {
    loadData();
    
    const unlistenShow = listen("ring:show", () => {
      setIsVisible(false);
      loadData();
      setHoveredMainId(null); setHoveredChildId(null); setClickedId(null);
      summonTimeRef.current = Date.now();
      setCenter({ x: 400, y: 400 });
      setAnimKey(k => k + 1);
      requestAnimationFrame(() => setIsVisible(true));
    });

    const unlistenHide = listen("ring:hide", () => {
      setIsVisible(false);
      setCenter({ x: -1000, y: -1000 }); 
      setHoveredMainId(null); setHoveredChildId(null);
      setTempProfileId(null); 
    });

    const unlistenKeyReleased = listen("ring:key_released", () => {
      const holdDuration = Date.now() - summonTimeRef.current;
      if (holdDuration < 200) return; 
      if (configRef.current?.triggerMode === "release") {
        executeAction(hoveredMainRef.current, hoveredChildRef.current);
      }
    });

    const unlistenSwitchProfile = listen<string>("switch_profile", (event) => {
      setTempProfileId(event.payload);
      setHoveredMainId(null);
      setHoveredChildId(null);
      setClickedId(null);
      setAnimKey(k => k + 1);
    });

    return () => {
      unlistenShow.then(f => f()); 
      unlistenHide.then(f => f()); 
      unlistenKeyReleased.then(f => f());
      unlistenSwitchProfile.then(f => f());
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
    if (hoveredMainId || hoveredChildId) {
      executeAction(hoveredMainId, hoveredChildId);
    } else {
      invoke("hide_action_ring").catch(console.error);
    }
  }, [hoveredMainId, hoveredChildId, slices]);

  return (
    <div className="absolute inset-0 w-[800px] h-[800px] select-none overflow-hidden" style={{ background: "transparent" }} onClick={handleClick}>
      <div key={animKey} className={`w-full h-full relative ${isVisible ? `opacity-100 ${animClass}` : "opacity-0 transition-none duration-0"}`}>
        
        <div className="absolute flex items-center justify-center rounded-full bg-zinc-900/80 border border-white/10"
             style={{ width: 46 * scaleMult, height: 46 * scaleMult, left: center.x, top: center.y, transform: "translate(-50%, -50%)", zIndex: 10 }}>
          <LucideIcons.X size={24 * scaleMult} strokeWidth={3} className="text-red-500" />
        </div>

        {slices.map((slice, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / slices.length;
          const animType = config?.animSpeed || "spring";

          const targetX = center.x + R_MAIN * Math.cos(angle);
          const targetY = center.y + R_MAIN * Math.sin(angle);

          let nx, ny;
          if (animType === "spring") {
            nx = isVisible ? targetX : center.x;
            ny = isVisible ? targetY : center.y;
          } else {
            nx = targetX; ny = targetY;
          }

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
            <div key={`wrapper-${slice.id}`}>
              {/* 💥 ลูกศรบอกสถานะว่าเป็น Folder (โผล่มาเฉพาะอันที่เป็น Folder) 💥 */}
              {slice.actionType === "folder" && (
                <div
                  className="absolute pointer-events-none flex items-center justify-center z-20"
                  style={{
                    left: center.x + (R_MAIN + 40 * scaleMult) * Math.cos(angle),
                    top: center.y + (R_MAIN + 40 * scaleMult) * Math.sin(angle),
                    transform: "translate(-50%, -50%)",
                    opacity: isVisible ? (clickedId !== null && clickedId !== slice.id ? 0.2 : 1) : 0,
                    transition: itemTransition,
                    transitionDelay: (isVisible && animType === "spring") ? `${i * 30}ms` : "0ms",
                  }}
                >
                  <LucideIcons.ChevronRight
                    size={(active ? 24 : 18)  * scaleMult}
                    strokeWidth={4}
                    className={`duration-200 ${active ? "text-white drop-shadow-md" : "text-zinc-500/80" }`}
                    style={{ transform: `rotate(${angle * (180 / Math.PI)}deg)` }}
                  />
                </div>
              )}

              {/* 💥 วงกลมไอคอนหลัก 💥 */}
              <div 
                className={`absolute flex items-center justify-center rounded-full shadow-xl ${active ? "ring-4 ring-white/30" : ""}`}
                style={{ 
                  width: size, height: size, left: nx, top: ny, 
                  transform: `translate(-50%, -50%) scale(${isVisible ? 1 : animType === 'instant' ? 1 : 0})`,
                  opacity: isVisible ? (clickedId !== null && clickedId !== slice.id ? 0.2 : 1) : 0,
                  backgroundColor: active ? (slice.color || "#6366f1") : "#C8C8D2", 
                  color: active ? "white" : "#18181b",
                  zIndex: active ? 30 : 20,
                  transition: itemTransition,
                  transitionDelay: (isVisible && animType === "spring") ? `${i * 30}ms` : "0ms", 
                }}
              >
                <Icon size={active ? 28 * scaleMult : 22 * scaleMult} strokeWidth={active ? 2.5 : 3} />
                {/* 💥 ปรับดีไซน์ป้ายชื่อปุ่มหลักให้พรีเมียมขึ้น 💥 */}
                {active && !hoveredChildId && (
                  <div 
                    className="absolute left-1/2 -translate-x-1/2 px-3.5 py-1 bg-zinc-900/90 text-zinc-100 text-[10px] font-extrabold uppercase tracking-widest rounded-full border border-white/10 backdrop-blur-md whitespace-nowrap pointer-events-none"
                    style={{ 
                      top: -(48 * scaleMult), // จัดระยะห่างให้สัมพันธ์กับขนาดวงแหวน
                      boxShadow: slice.color ? `0 6px 20px ${slice.color}40` : '0 6px 20px rgba(0,0,0,0.4)' // เงาเรืองแสงตามสีปุ่ม!
                    }}
                  >
                    {slice.label}
                  </div>
                )}
              </div>
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
                  {/* 💥 ปรับดีไซน์ป้ายชื่อปุ่มในโฟลเดอร์ให้เข้าคู่กัน 💥 */}
                  {active && (
                    <div 
                      className="absolute px-3 py-1 bg-zinc-900/90 text-zinc-100 font-extrabold uppercase tracking-widest rounded-full border border-white/10 backdrop-blur-md whitespace-nowrap pointer-events-none"
                      style={{ 
                        left: center.x + (R_OUTER + 65 * scaleMult) * Math.cos(angle), 
                        top: center.y + (R_OUTER + 55 * scaleMult) * Math.sin(angle), 
                        transform: "translate(-50%, -50%)", 
                        fontSize: `${9 * scaleMult}px`, // ปรับขนาดฟอนต์ให้เล็กและเรียบหรูขึ้น
                        boxShadow: child.color ? `0 6px 20px ${child.color}40` : '0 6px 20px rgba(0,0,0,0.4)'
                      }}
                    >
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