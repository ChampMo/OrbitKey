/**
 * ActionRing.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Master Version: Perfect Centering + Folder Expand/Collapse + Adaptive Themes
 */

import { useEffect, useState, useRef, Fragment } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event"; 
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import * as LucideIcons from "lucide-react";
import { THEMES, ThemeId } from "./Theme"; 

interface ApiSlice { id: string; label: string; icon?: string; color?: string; actionType: string; actionData?: string | null; scriptArgs?: string[]; children?: ApiSlice[] | null; }
interface ApiProfile { id: string; name: string; slices: ApiSlice[]; isDefault: boolean; }
interface AppSettings { 
  globalHotkey: string; startWithOS: boolean; ringScale: number; closeAfterExec: boolean; 
  triggerMode: string; animSpeed: string; deadzone: number; centerAction: string; theme: ThemeId;
}

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

  // State สำหรับควบคุมแอนิเมชันเข้า-ออกของโฟลเดอร์
  const [animFolderId, setAnimFolderId] = useState<string | null>(null);

  const slicesRef = useRef<ApiSlice[]>([]);
  const configRef = useRef<AppSettings | null>(null);
  const hoveredMainRef = useRef<string | null>(null);
  const hoveredChildRef = useRef<string | null>(null);
  const summonTimeRef = useRef<number>(0);

  useEffect(() => { slicesRef.current = slices; }, [slices]);
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { hoveredMainRef.current = hoveredMainId; }, [hoveredMainId]);
  useEffect(() => { hoveredChildRef.current = hoveredChildId; }, [hoveredChildId]);

  // หน่วงเวลา 10ms ก่อนกางโฟลเดอร์ เพื่อให้ CSS Animation ทำงานได้สมูท
  useEffect(() => {
    if (hoveredMainId && slices.find(s => s.id === hoveredMainId)?.actionType === 'folder') {
      const timer = setTimeout(() => setAnimFolderId(hoveredMainId), 10);
      return () => clearTimeout(timer);
    } else {
      setAnimFolderId(null);
    }
  }, [hoveredMainId, slices]);

  const scaleMult = (config?.ringScale || 100) / 100;
  const R_MAIN = 90 * scaleMult;
  const R_OUTER = 180 * scaleMult;
  const NODE_SIZE = 50 * scaleMult;
  const NODE_SIZE_HOV = 60 * scaleMult;
  const NODE_SIZE_CHILD = 50 * scaleMult;
  const NODE_SIZE_CHILD_HOV = 60 * scaleMult;
  const DEAD_ZONE = config?.deadzone || 30;

  const activeTheme = THEMES[config?.theme || "dark"] || THEMES.dark;

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
      if (profiles && profiles.length > 0) setAllProfiles(profiles);
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
      const isReleaseMode = currentConfig?.triggerMode === "release";
      const settingClose = currentConfig?.closeAfterExec === true;
      const isSwitchProfile = targetSlice.actionType === "switch_profile";
      const shouldClose = !isSwitchProfile && (isReleaseMode || settingClose);

      if (shouldClose) await invoke("hide_action_ring").catch(console.error);
      else setTimeout(() => { setClickedId(null); }, 150);
      
      let permissionGranted = false;
      try {
        permissionGranted = await isPermissionGranted();
        if (!permissionGranted) permissionGranted = (await requestPermission()) === 'granted';
      } catch (e) { console.warn(e); }

      const shouldNotify = targetSlice.actionType === "multi_action" || targetSlice.actionType === "script";
      if (permissionGranted && shouldNotify) sendNotification({ title: 'Action Ring', body: `⏳ Starting: ${targetSlice.label}...` });

      try {
        await invoke("execute_action", { action: targetSlice });
        if (permissionGranted && shouldNotify) sendNotification({ title: 'Action Ring', body: `✅ Executed: ${targetSlice.label}` });
      } catch (err) {
        if (permissionGranted) sendNotification({ title: 'Action Ring Error', body: `❌ Failed: ${targetSlice.label}` });
      }
    } else if (!targetSlice || (targetSlice.actionType !== "folder" && !mainId)) {
      if (currentConfig?.triggerMode === "release" || !mainId) {
        invoke("hide_action_ring").catch(console.error);
      }
    }
  };

  useEffect(() => {
    loadData();
    const unlistenShow = listen("ring:show", (event: any) => {
      const { local_x, local_y } = event.payload;
      setIsVisible(false); 
      loadData(); 
      setHoveredMainId(null); 
      setHoveredChildId(null); 
      setClickedId(null);
      summonTimeRef.current = Date.now(); 
      setCenter({ x: local_x, y: local_y }); 
      setAnimKey(k => k + 1);
      requestAnimationFrame(() => setIsVisible(true));
    });
    
    const unlistenHide = listen("ring:hide", () => { setIsVisible(false); setCenter({ x: -1000, y: -1000 }); setHoveredMainId(null); setHoveredChildId(null); setTempProfileId(null); });
    const unlistenKeyReleased = listen("ring:key_released", () => {
      if (Date.now() - summonTimeRef.current < 200) return; 
      if (configRef.current?.triggerMode === "release") executeAction(hoveredMainRef.current, hoveredChildRef.current);
    });
    const unlistenSwitchProfile = listen<string>("switch_profile", (event) => { setTempProfileId(event.payload); setHoveredMainId(null); setHoveredChildId(null); setClickedId(null); setAnimKey(k => k + 1); });

    return () => { unlistenShow.then(f => f()); unlistenHide.then(f => f()); unlistenKeyReleased.then(f => f()); unlistenSwitchProfile.then(f => f()); };
  }, []);

  // 💥 ท่าไม้ตายสุดท้าย: Polling พิกัดเมาส์ทะลุระบบความปลอดภัยของ macOS 💥
  useEffect(() => {
    // ถ้าหน้าต่างปิดอยู่ หรือกดคลิกไปแล้ว ไม่ต้องอ่านพิกัดให้เปลือง CPU
    if (!isVisible || clickedId !== null) return;

    let isPolling = false;

    const timer = setInterval(async () => {
      if (isPolling) return;
      isPolling = true;

      try {
        // 💥 เรียกคำสั่ง Rust ที่เราเพิ่งสร้าง มันจะคืนค่ากลับมาเป็น Array [x, y] เป๊ะๆ!
        const [mouseX, mouseY] = await invoke<[number, number]>("get_mouse_position");
        
        const dx = mouseX - center.x; 
        const dy = mouseY - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy); 
        const angle = Math.atan2(dy, dx);
        
        if (dist < DEAD_ZONE) { 
          setHoveredMainId(null); 
          setHoveredChildId(null); 
        } else if (hoveredMainId && dist > R_MAIN + (40 * scaleMult)) {
          const folder = slices.find(s => s.id === hoveredMainId);
          if (folder?.children && folder.children.length > 0) {
            const folderIdx = slices.findIndex(s => s.id === hoveredMainId);
            const parentAngle = -Math.PI / 2 + (folderIdx * 2 * Math.PI) / slices.length;
            const step = Math.PI / 6.5; 
            const startAngle = parentAngle - ((folder.children.length - 1) * step) / 2;
            let closestIdx = -1; 
            let minDiff = Infinity;
            folder.children.forEach((_, i) => {
              const childAngle = startAngle + i * step; 
              const diff = Math.abs(Math.atan2(Math.sin(angle - childAngle), Math.cos(angle - childAngle)));
              if (diff < minDiff) { minDiff = diff; closestIdx = i; }
            });
            if (minDiff < step / 1.5) { setHoveredChildId(folder.children[closestIdx].id); }
          }
        } else if (slices.length > 0 && dist <= R_MAIN + (45 * scaleMult)) {
          setHoveredChildId(null);
          const step = (2 * Math.PI) / slices.length; 
          const origin = -Math.PI / 2 - step / 2;
          const normalised = (((angle - origin) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
          const idx = Math.min(Math.floor(normalised / step), slices.length - 1);
          
          if (hoveredMainId !== slices[idx].id) setHoveredMainId(slices[idx].id);
        }
      } catch (e) {
        // เงียบไว้เผื่อจังหวะหน้าต่างกำลังปิด
      } finally {
        isPolling = false;
      }
    }, 16); // 16ms = ทำงานที่ 60 เฟรมต่อวินาที (ลื่นๆ ไม่หน่วง)

    return () => clearInterval(timer);
  }, [slices, hoveredMainId, clickedId, center, isVisible, DEAD_ZONE, R_MAIN, scaleMult]);


  return (
    // 💥 ใส่สีดำโปร่งใส 1% เพื่อกันเหนียวให้ macOS ยอมส่ง Event การคลิก (MouseUp) มาให้เรา 💥
    <div 
      className="fixed inset-0 w-screen h-screen select-none overflow-hidden" 
      style={{ backgroundColor: "rgba(0, 0, 0, 0.01)" }}
      onMouseUp={() => { 
        if(hoveredMainId || hoveredChildId) executeAction(hoveredMainId, hoveredChildId); 
        else invoke("hide_action_ring").catch(console.error); 
      }}
    >
      <div key={animKey} className={`w-full h-full relative ${isVisible ? `opacity-100 ${animClass}` : "opacity-0 transition-none duration-0"}`}>
        
        {/* กากบาทตรงกลาง */}
        <div className="absolute flex items-center justify-center rounded-full bg-zinc-900/80 border border-white/10"
        style={{ width: 46 * scaleMult, height: 46 * scaleMult, left: center.x, top: center.y, transform: "translate(-50%, -50%)", zIndex: 10 }}>
          <LucideIcons.X size={24 * scaleMult} strokeWidth={3} className="text-red-500" />
        </div>

        {/* ─── วงแหวนหลัก (Main Slices) ─── */}
        {slices.map((slice, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / slices.length;
          const animType = config?.animSpeed || "spring";
          const targetX = center.x + R_MAIN * Math.cos(angle); const targetY = center.y + R_MAIN * Math.sin(angle);
          const nx = animType === "spring" ? (isVisible ? targetX : center.x) : targetX;
          const ny = animType === "spring" ? (isVisible ? targetY : center.y) : targetY;

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
            <Fragment key={`wrapper-${slice.id}`}>
              {slice.actionType === "folder" && (
                <div className="absolute pointer-events-none flex items-center justify-center z-20"
                     style={{ left: center.x + (R_MAIN + 40 * scaleMult) * Math.cos(angle), top: center.y + (R_MAIN + 40 * scaleMult) * Math.sin(angle), transform: "translate(-50%, -50%)",
                              opacity: isVisible ? (clickedId !== null && clickedId !== slice.id ? 0.2 : 1) : 0, transition: itemTransition, transitionDelay: (isVisible && animType === "spring") ? `${i * 30}ms` : "0ms" }}>
                  <LucideIcons.ChevronRight size={(active ? 24 : 18) * scaleMult} strokeWidth={4} className={`duration-200 ${active ? "text-current drop-shadow-md" : "text-zinc-500/80"}`} style={{ transform: `rotate(${angle * (180 / Math.PI)}deg)` }} />
                </div>
              )}

              <div className={`absolute flex items-center justify-center rounded-full shadow-xl ${active ? activeTheme.ringColor : ""}`}
                   style={{ width: size, height: size, left: nx, top: ny, transform: `translate(-50%, -50%) scale(${isVisible ? 1 : animType === 'instant' ? 1 : 0})`,
                            opacity: isVisible ? (clickedId !== null && clickedId !== slice.id ? 0.2 : 1) : 0,
                            backgroundColor: active ? (slice.color || "#6366f1") : (activeTheme.isDark ? "#27272a" : "#e4e4e7"), 
                            color: active ? "white" : activeTheme.isDark ? "#d4d4d8" : "#3f3f46",
                            zIndex: active ? 30 : 20, transition: itemTransition, transitionDelay: (isVisible && animType === "spring") ? `${i * 30}ms` : "0ms" }}>
                <Icon size={active ? 28 * scaleMult : 22 * scaleMult} strokeWidth={active ? 2.5 : 3} />
              </div>
              
              <div className={`absolute px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-widest rounded-full border backdrop-blur-md whitespace-nowrap transition-all duration-200 pointer-events-none shadow-xl ${activeTheme.panel} ${activeTheme.border} ${activeTheme.text}`}
                   style={{ left: nx, top: ny - (48 * scaleMult), transform: "translate(-50%, -50%)", opacity: active && !hoveredChildId ? 1 : 0, boxShadow: slice.color ? `0 6px 20px ${slice.color}40` : '' }}>
                {slice.label}
              </div>
            </Fragment>
          );
        })}

        {/* ─── 💥 วงแหวนย่อย (Sub Slices) โฟลเดอร์เด้งสมูทๆ 💥 ─── */}
        {slices.map((folder, folderIdx) => {
          if (folder.actionType !== 'folder') return null;
          const children = folder.children || [];
          if (children.length === 0) return null;

          const parentAngle = -Math.PI / 2 + (folderIdx * 2 * Math.PI) / slices.length;
          
          const parentX = center.x + R_MAIN * Math.cos(parentAngle);
          const parentY = center.y + R_MAIN * Math.sin(parentAngle);

          const step = Math.PI / 6.5;
          const startAngle = parentAngle - ((children.length - 1) * step) / 2;

          const isFolderOpen = animFolderId === folder.id;

          return (
            <Fragment key={`folder-anim-${folder.id}`}>
              {children.map((child, i) => {
                const angle = startAngle + i * step;
                const targetNx = center.x + R_OUTER * Math.cos(angle);
                const targetNy = center.y + R_OUTER * Math.sin(angle);
                
                const active = hoveredChildId === child.id;
                const isClicked = clickedId === child.id;
                const Icon = (LucideIcons as any)[child.icon || "Zap"] || LucideIcons.Zap;
                const size = isClicked ? NODE_SIZE_CHILD - (10 * scaleMult) : active ? NODE_SIZE_CHILD_HOV : NODE_SIZE_CHILD;

                const animType = config?.animSpeed || "spring";
                let itemTransition = "";
                if (animType === "instant") itemTransition = "none";
                if (animType === "fast")    itemTransition = "all 0.15s ease-out";
                if (animType === "smooth")  itemTransition = "all 0.3s ease-in-out";
                if (animType === "spring")  itemTransition = "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";

                const currentX = isFolderOpen ? targetNx : parentX;
                const currentY = isFolderOpen ? targetNy : parentY;
                const currentScale = isFolderOpen ? 1 : 0.4;
                const currentOpacity = isFolderOpen ? (clickedId !== null && clickedId !== child.id ? 0.2 : 1) : 0;

                return (
                  <div key={child.id} className="pointer-events-none">
                    
                    <div className={`absolute flex items-center justify-center rounded-full shadow-lg z-30 ${active && isFolderOpen ? activeTheme.ringColor : ""}`}
                         style={{ 
                           width: size, height: size, 
                           left: currentX, top: currentY, 
                           transform: `translate(-50%, -50%) scale(${currentScale})`,
                           opacity: currentOpacity,
                           backgroundColor: active && isFolderOpen ? (child.color || "#6366f1") : (activeTheme.isDark ? "#3f3f46" : "#f4f4f5"), 
                           color: active && isFolderOpen ? "white" : activeTheme.isDark ? "#d4d4d8" : "#71717a",
                           transition: itemTransition,
                           transitionDelay: (isFolderOpen && animType === "spring") ? `${i * 30}ms` : "0ms" 
                         }}>
                      <Icon size={active && isFolderOpen ? 26 * scaleMult : 20 * scaleMult} strokeWidth={active && isFolderOpen ? 2.5 : 3} />
                    </div>
                    
                    <div className={`absolute px-3 py-1 font-extrabold uppercase tracking-widest rounded-full border backdrop-blur-md whitespace-nowrap transition-all duration-200 pointer-events-none shadow-xl ${activeTheme.panel} ${activeTheme.border} ${activeTheme.text}`}
                         style={{ 
                           left: center.x + (R_OUTER + 65 * scaleMult) * Math.cos(angle), 
                           top: center.y + (R_OUTER + 55 * scaleMult) * Math.sin(angle), 
                           transform: "translate(-50%, -50%)", 
                           fontSize: `${9 * scaleMult}px`,
                           boxShadow: child.color ? `0 6px 20px ${child.color}40` : '0 6px 20px rgba(0,0,0,0.4)',
                           opacity: active && isFolderOpen ? 1 : 0 
                         }}>
                      {child.label}
                    </div>
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}