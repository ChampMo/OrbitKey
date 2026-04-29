/**
 * ActionRing.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Master Version: Perfect Centering + Folder Expand + Polished Switch Animations (Fixed Spin & Smooth)
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
  triggerMode: string; animSpeed: string; deadzone: number; centerAction: string; theme: ThemeId; switchAnimStyle: string;
}

export default function ActionRing() {
  const isWindows = navigator.userAgent.includes("Windows");
  const [allProfiles, setAllProfiles] = useState<ApiProfile[]>([]);
  const [tempProfileId, setTempProfileId] = useState<string | null>(null);
  
  const [slices, setSlices] = useState<ApiSlice[]>([]);
  const [config, setConfig] = useState<AppSettings | null>(null);
  const [animKey, setAnimKey] = useState(0);
  
  const [center, setCenter] = useState({ x: -1000, y: -1000 });
  const [isVisible, setIsVisible] = useState(false); 

  const [isSwitching, setIsSwitching] = useState(false);
  const [spinDeg, setSpinDeg] = useState(0); 
  const [noTransition, setNoTransition] = useState(false); 

  const [hoveredMainId, setHoveredMainId] = useState<string | null>(null);
  const [hoveredChildId, setHoveredChildId] = useState<string | null>(null);
  const [clickedId, setClickedId] = useState<string | null>(null);
  const [animFolderId, setAnimFolderId] = useState<string | null>(null);

  const allProfilesRef = useRef<ApiProfile[]>([]); 
  const slicesRef = useRef<ApiSlice[]>([]);
  const configRef = useRef<AppSettings | null>(null);
  const hoveredMainRef = useRef<string | null>(null);
  const hoveredChildRef = useRef<string | null>(null);
  const summonTimeRef = useRef<number>(0);

  useEffect(() => { allProfilesRef.current = allProfiles; }, [allProfiles]);
  useEffect(() => { slicesRef.current = slices; }, [slices]);
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { hoveredMainRef.current = hoveredMainId; }, [hoveredMainId]);
  useEffect(() => { hoveredChildRef.current = hoveredChildId; }, [hoveredChildId]);

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
  const switchAnimStyle = config?.switchAnimStyle || "none"; 

  const isSummoning = Date.now() - summonTimeRef.current < 500;
  const effAnimSpeed = (isSummoning && switchAnimStyle === "spring") ? "spring" : config?.animSpeed;

  let animClass = "";
  switch (effAnimSpeed) {
    case "instant": animClass = "transition-none"; break;
    case "fast": animClass = isVisible ? "scale-100 transition-all duration-150 ease-out" : "scale-90 transition-all duration-150 ease-in"; break;
    case "smooth": animClass = isVisible ? "scale-100 blur-0 transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)" : "scale-75 blur-sm transition-all duration-300 ease-in"; break;
    case "spring": animClass = isVisible ? "animate-spring-custom" : "scale-50 transition-all duration-200 ease-in"; break;
    default: animClass = isVisible ? "scale-100" : "scale-95 transition-all duration-150";
  }

  // 💥 2. ระบบจัดการ Class อนิเมชันแบบเป๊ะๆ
  let wrapperClasses = "w-full h-full relative transform ";

  if (!isVisible) {
      wrapperClasses += "opacity-0 pointer-events-none " + animClass;
  } else if (isSwitching) {
      wrapperClasses += "opacity-0 pointer-events-none ";
      switch (switchAnimStyle) {
          case "cyber-spin": wrapperClasses += "scale-75 blur-sm transition-all duration-200 ease-in"; break;
          case "quantum-pop": wrapperClasses += "scale-50 transition-all duration-150 ease-in"; break;
          case "smooth": case "fade": case "fade-slide": wrapperClasses += "scale-90 blur-md transition-all duration-200 ease-in"; break;
      }
  } else {
      wrapperClasses += "opacity-100 pointer-events-auto ";
      if (isSummoning) {
          wrapperClasses += animClass;
      } else {
          wrapperClasses += "scale-100 blur-0 "; // ล็อกให้กาง 100%
          switch (switchAnimStyle) {
              case "cyber-spin": wrapperClasses += "transition-all duration-200 ease-out"; break;
              case "quantum-pop": wrapperClasses += "transition-all duration-300 cubic-bezier(0.34, 1.56, 0.64, 1)"; break;
              // 💥 Smooth ตอนกลับมา: เฟดกลับมานุ่มๆ
              case "smooth": case "fade": case "fade-slide": wrapperClasses += "transition-all duration-300 ease-out"; break;
          }
      }
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

      if (shouldClose) closeRing();
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
      const { local_x, local_y } = event.payload || { local_x: -1000, local_y: -1000 };
      
      setIsVisible(false); 
      setIsSwitching(false); 
      setNoTransition(false);
      setSpinDeg(0); 
      setHoveredMainId(null); 
      setHoveredChildId(null); 
      setClickedId(null);
      setAnimFolderId(null);
      
      loadData(); 
      summonTimeRef.current = Date.now(); 
      
      if (isWindows) setCenter({ x: 400, y: 400 });
      else setCenter({ x: local_x, y: local_y });

      setAnimKey(k => k + 1);
      requestAnimationFrame(() => setIsVisible(true));
    });
    
    const unlistenHide = listen("ring:hide", () => { 
      setIsVisible(false); 
      setIsSwitching(false); 
      setCenter({ x: -1000, y: -1000 }); 
      setHoveredMainId(null); 
      setHoveredChildId(null); 
      setAnimFolderId(null);
      setTempProfileId(null); 
      setSpinDeg(0); 
    });
    
    const unlistenKeyReleased = listen("ring:key_released", () => {
      if (Date.now() - summonTimeRef.current < 200) return; 
      if (configRef.current?.triggerMode === "release") executeAction(hoveredMainRef.current, hoveredChildRef.current);
    });

    const unlistenSwitchProfile = listen<string>("switch_profile", (event) => { 
      const style = configRef.current?.switchAnimStyle || "none";
      const targetId = event.payload;

      const applyNewProfile = () => {
        const profiles = allProfilesRef.current;
        const active = targetId ? profiles.find(p => p.id === targetId) : profiles.find(p => p.isDefault);
        if (active) setSlices(active.slices);
        setTempProfileId(targetId);
      };

      if (style === "none") {
        setNoTransition(true); 
        applyNewProfile(); 
        setAnimKey(k => k + 1); 
        setTimeout(() => setNoTransition(false), 50);
        return;
      }

      setIsSwitching(true);
      setHoveredMainId(null); 
      setHoveredChildId(null); 
      setClickedId(null); 
      setAnimFolderId(null);
      
      let outDuration = 150;
      if (style === "cyber-spin") {
        outDuration = 200; 
        setSpinDeg(prev => prev + 90); // 💥 สั่งบวกเพิ่มไปเรื่อยๆ
      } else if (style === "smooth" || style === "fade" || style === "fade-slide") {
        outDuration = 200;
      }
      
      setTimeout(() => {
        applyNewProfile(); 
        setIsSwitching(false);
        if (style === "cyber-spin") {
           setSpinDeg(prev => prev + 90); // 💥 ขากลับก็บวกเพิ่มไปทิศเดิม ไม่หักล้าง
        }
      }, outDuration);
    });

    return () => { unlistenShow.then(f => f()); unlistenHide.then(f => f()); unlistenKeyReleased.then(f => f()); unlistenSwitchProfile.then(f => f()); };
  }, []);

  useEffect(() => {
    if (!isVisible || clickedId !== null || isSwitching) return; 

    let isPolling = false;
    const timer = setInterval(async () => {
      if (isPolling) return;
      isPolling = true;

      try {
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
      } finally {
        isPolling = false;
      }
    }, 16); 

    return () => clearInterval(timer);
  }, [slices, hoveredMainId, clickedId, center, isVisible, isSwitching, DEAD_ZONE, R_MAIN, scaleMult]); 

  const closeRing = () => {
    setIsVisible(false);
    setIsSwitching(false);

    let delay = 0;
    switch (configRef.current?.animSpeed) {
      case "fast": delay = 150; break;
      case "smooth": delay = 300; break;
      case "spring": delay = 200; break;
      default: delay = 0; break;
    }

    setTimeout(() => {
      invoke("hide_action_ring").catch(console.error);
      setCenter({ x: -1000, y: -1000 });
      setHoveredMainId(null);
      setHoveredChildId(null);
      setAnimFolderId(null);
      setTempProfileId(null);
      setSpinDeg(0); 
      setNoTransition(false);
    }, delay);
  };

  return (
    <div 
      className="fixed inset-0 w-screen h-screen select-none overflow-hidden" 
      onMouseUp={() => { 
        if(hoveredMainId || hoveredChildId) executeAction(hoveredMainId, hoveredChildId); 
        else closeRing(); 
      }}
    >
      <div 
        key={animKey} 
        className={wrapperClasses} 
        style={{ 
          transformOrigin: `${center.x}px ${center.y}px`,
          // 💥 ใช้ CSS property 'rotate' แทน ไม่ตีกับ Tailwind 'transform' ทำให้บวกเพิ่มได้เรื่อยๆ
          ...(switchAnimStyle === 'cyber-spin' ? { rotate: `${spinDeg}deg` } as React.CSSProperties : {}) 
        }} 
      >
        
        <div className="absolute flex items-center justify-center rounded-full bg-zinc-900/80 border border-white/10"
        style={{ width: 46 * scaleMult, height: 46 * scaleMult, left: center.x, top: center.y, transform: "translate(-50%, -50%)", zIndex: 10 }}>
          <LucideIcons.X size={24 * scaleMult} strokeWidth={3} className="text-red-500" />
        </div>

        {slices.map((slice, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / slices.length;
          const animType = effAnimSpeed || "spring";
          const targetX = center.x + R_MAIN * Math.cos(angle); const targetY = center.y + R_MAIN * Math.sin(angle);
          const nx = animType === "spring" ? (isVisible ? targetX : center.x) : targetX;
          const ny = animType === "spring" ? (isVisible ? targetY : center.y) : targetY;

          let itemTransition = "";
          if (noTransition) {
            itemTransition = "none";
          } else {
            if (animType === "instant") itemTransition = "none";
            if (animType === "fast")    itemTransition = "all 0.15s ease-out";
            if (animType === "smooth")  itemTransition = "all 0.3s ease-in-out";
            if (animType === "spring")  itemTransition = "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";
          }

          const animDelay = (isVisible && animType === "spring" && isSummoning && !noTransition) ? `${i * 30}ms` : "0ms";

          const active = hoveredMainId === slice.id;
          const isClicked = clickedId === slice.id;
          const Icon = (LucideIcons as any)[slice.icon || "Zap"] || LucideIcons.Zap;
          const size = isClicked ? NODE_SIZE - (10 * scaleMult) : active ? NODE_SIZE_HOV : NODE_SIZE;

          return (
            <Fragment key={`wrapper-${slice.id}`}>
              {slice.actionType === "folder" && (
                <div className="absolute pointer-events-none flex items-center justify-center z-20"
                     style={{ left: center.x + (R_MAIN + 40 * scaleMult) * Math.cos(angle), top: center.y + (R_MAIN + 40 * scaleMult) * Math.sin(angle), transform: "translate(-50%, -50%)",
                              opacity: isVisible ? (clickedId !== null && clickedId !== slice.id ? 0.2 : 1) : 0, transition: itemTransition, transitionDelay: animDelay }}>
                  <LucideIcons.ChevronRight size={(active ? 24 : 18) * scaleMult} strokeWidth={4} className={`duration-200 ${active ? "text-white drop-shadow-md" : "text-zinc-500/80"}`} style={{ transform: `rotate(${angle * (180 / Math.PI)}deg)` }} />
                </div>
              )}

              <div className={`absolute flex items-center justify-center rounded-full shadow-xl ${active ? activeTheme.ringColor : ""}`}
                   style={{ width: size, height: size, left: nx, top: ny, transform: `translate(-50%, -50%) scale(${isVisible ? 1 : animType === 'instant' ? 1 : 0})`,
                            opacity: isVisible ? (clickedId !== null && clickedId !== slice.id ? 0.2 : 1) : 0,
                            backgroundColor: active ? (slice.color || "#6366f1") : ("#e4e4e7"), 
                            color: active ? "white" : "#3f3f46",
                            zIndex: active ? 30 : 20, transition: itemTransition, transitionDelay: animDelay }}>
                <Icon size={active ? 28 * scaleMult : 22 * scaleMult} strokeWidth={active ? 2.5 : 3} />
              </div>
              
              <div className={`absolute z-50 px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-widest rounded-full border backdrop-blur-md whitespace-nowrap transition-all duration-200 pointer-events-none shadow-xl ${activeTheme.panel} ${activeTheme.border} ${activeTheme.text}`}
                   style={{ left: nx, top: ny - (48 * scaleMult), transform: "translate(-50%, -50%)", opacity: active && !hoveredChildId ? 1 : 0, boxShadow: slice.color ? `0 6px 20px ${slice.color}40` : '' }}>
                {slice.label}
              </div>
            </Fragment>
          );
        })}

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

                const animType = effAnimSpeed || "spring";
                let itemTransition = "";
                if (noTransition) {
                  itemTransition = "none";
                } else {
                  if (animType === "instant") itemTransition = "none";
                  if (animType === "fast")    itemTransition = "all 0.15s ease-out";
                  if (animType === "smooth")  itemTransition = "all 0.3s ease-in-out";
                  if (animType === "spring")  itemTransition = "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";
                }

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
                           backgroundColor: active && isFolderOpen ? (child.color || "#6366f1") : ( "#f4f4f5"), 
                           color: active && isFolderOpen ? "white" :  "#3f3f46",
                           transition: itemTransition,
                           transitionDelay: (isFolderOpen && animType === "spring" && !noTransition) ? `${i * 30}ms` : "0ms" 
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