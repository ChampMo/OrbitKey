/**
 * ActionRing.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Hover is driven by "ring:cursor" Tauri events emitted from Rust every ~8ms,
 * NOT by DOM mousemove.  On a macOS NonActivatingPanel, DOM mousemove / CSS
 * hover only fire when a mouse button is held — that's a window server
 * restriction that no frontend trick can bypass.  Rust's CGEventGetLocation
 * works regardless of which app is active, so we use that as the source of
 * truth for cursor position.
 *
 * Click handling uses the DOM mousedown/mouseup on the root div — those DO
 * fire on NonActivatingPanel because they are driven by the button-press event
 * stream (separate from the mouseMoved stream).  A CLICK_GUARD prevents the
 * OS-synthetic mouseup from the hotkey release from immediately dismissing
 * the ring.
 */

import { useEffect, useState, useRef, Fragment, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import * as LucideIcons from "lucide-react";
import { THEMES, ThemeId } from "./Theme";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ApiSlice {
  id: string; label: string; icon?: string; color?: string;
  actionType: string; actionData?: string | null;
  scriptArgs?: string[]; children?: ApiSlice[] | null;
}
interface ApiProfile { id: string; name: string; slices: ApiSlice[]; isDefault: boolean; }
interface AppSettings {
  globalHotkey: string; startWithOS: boolean; ringScale: number;
  closeAfterExec: boolean; triggerMode: string; animSpeed: string;
  deadzone: number; centerAction: string; theme: ThemeId;
}

// Ignore the first mouseup after the ring appears (it's the hotkey release).
const CLICK_GUARD_MS = 250;
// Treat mouse travel > this many px between down and up as a drag, not a click.
const DRAG_THRESHOLD_PX = 8;

export default function ActionRing() {
  const [allProfiles, setAllProfiles]   = useState<ApiProfile[]>([]);
  const [tempProfileId, setTempProfileId] = useState<string | null>(null);
  const [slices, setSlices]             = useState<ApiSlice[]>([]);
  const [config, setConfig]             = useState<AppSettings | null>(null);
  const [animKey, setAnimKey]           = useState(0);
  const [center, setCenter]             = useState({ x: -1000, y: -1000 });
  const [isVisible, setIsVisible]       = useState(false);
  const [hoveredMainId, setHoveredMainId]   = useState<string | null>(null);
  const [hoveredChildId, setHoveredChildId] = useState<string | null>(null);
  const [clickedId, setClickedId]       = useState<string | null>(null);
  const [animFolderId, setAnimFolderId] = useState<string | null>(null);

  // Stable refs so event-listener callbacks never have stale closure values.
  const slicesRef       = useRef<ApiSlice[]>([]);
  const configRef       = useRef<AppSettings | null>(null);
  const hoveredMainRef  = useRef<string | null>(null);
  const hoveredChildRef = useRef<string | null>(null);
  const centerRef       = useRef({ x: -1000, y: -1000 });
  const isVisibleRef    = useRef(false);
  const summonTimeRef   = useRef(0);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { slicesRef.current = slices; },         [slices]);
  useEffect(() => { configRef.current = config; },         [config]);
  useEffect(() => { hoveredMainRef.current = hoveredMainId; },   [hoveredMainId]);
  useEffect(() => { hoveredChildRef.current = hoveredChildId; }, [hoveredChildId]);
  useEffect(() => { centerRef.current = center; },         [center]);
  useEffect(() => { isVisibleRef.current = isVisible; },   [isVisible]);

  // Layout constants.
  const scaleMult      = (config?.ringScale || 100) / 100;
  const R_MAIN         = 90  * scaleMult;
  const R_OUTER        = 180 * scaleMult;
  const NODE_SIZE      = 50  * scaleMult;
  const NODE_SIZE_HOV  = 60  * scaleMult;
  const NODE_SIZE_CHILD     = 50 * scaleMult;
  const NODE_SIZE_CHILD_HOV = 60 * scaleMult;
  const DEAD_ZONE      = config?.deadzone || 30;

  const activeTheme = THEMES[config?.theme || "dark"] || THEMES.dark;

  let animClass = "";
  switch (config?.animSpeed) {
    case "instant": animClass = "opacity-100 transition-none"; break;
    case "fast":    animClass = isVisible ? "opacity-100 scale-100 transition-all duration-150 ease-out" : "opacity-0 scale-90 transition-none"; break;
    case "smooth":  animClass = isVisible ? "opacity-100 scale-100 blur-0 transition-all duration-300" : "opacity-0 scale-75 blur-md transition-none"; break;
    case "spring":  animClass = isVisible ? "animate-spring-custom" : "opacity-0 scale-50 transition-none"; break;
    default:        animClass = isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95";
  }

  // ─── Folder open animation (10 ms debounce) ────────────────────────────────
  useEffect(() => {
    if (hoveredMainId && slices.find(s => s.id === hoveredMainId)?.actionType === "folder") {
      const t = setTimeout(() => setAnimFolderId(hoveredMainId), 10);
      return () => clearTimeout(t);
    }
    setAnimFolderId(null);
  }, [hoveredMainId, slices]);

  // ─── Data loading ──────────────────────────────────────────────────────────
  const loadData = async () => {
    try {
      const [profiles, settings] = await Promise.all([
        invoke<ApiProfile[]>("get_profiles").catch(() => null),
        invoke<AppSettings>("get_settings").catch(() => null),
      ]);
      if (profiles?.length) setAllProfiles(profiles);
      if (settings) setConfig(settings);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (!allProfiles.length) return;
    const active = tempProfileId
      ? allProfiles.find(p => p.id === tempProfileId)
      : allProfiles.find(p => p.isDefault);
    setSlices(active?.slices || allProfiles[0].slices);
  }, [allProfiles, tempProfileId]);

  // ─── Action execution ──────────────────────────────────────────────────────
  const executeAction = useCallback(async (
    mainId: string | null,
    childId: string | null,
  ) => {
    const currentSlices = slicesRef.current;
    const currentConfig = configRef.current as any;

    let target: ApiSlice | null = null;
    if (childId && mainId)
      target = currentSlices.find(s => s.id === mainId)?.children?.find(c => c.id === childId) || null;
    else if (mainId)
      target = currentSlices.find(s => s.id === mainId) || null;

    if (target && target.actionType !== "folder") {
      setClickedId(target.id);
      const isRelease      = currentConfig?.triggerMode === "release";
      const settingClose   = currentConfig?.closeAfterExec === true;
      const isSwitchProfile = target.actionType === "switch_profile";
      const shouldClose    = !isSwitchProfile && (isRelease || settingClose);

      if (shouldClose) await invoke("hide_action_ring").catch(console.error);
      else setTimeout(() => setClickedId(null), 150);

      let perm = false;
      try {
        perm = await isPermissionGranted();
        if (!perm) perm = (await requestPermission()) === "granted";
      } catch {}

      const shouldNotify = target.actionType === "multi_action" || target.actionType === "script";
      if (perm && shouldNotify)
        sendNotification({ title: "Action Ring", body: `⏳ Starting: ${target.label}...` });

      try {
        await invoke("execute_action", { action: target });
        if (perm && shouldNotify)
          sendNotification({ title: "Action Ring", body: `✅ Executed: ${target.label}` });
      } catch {
        if (perm)
          sendNotification({ title: "Action Ring Error", body: `❌ Failed: ${target.label}` });
      }
    } else if (!target || (!mainId && target?.actionType !== "folder")) {
      if (currentConfig?.triggerMode === "release" || !mainId)
        invoke("hide_action_ring").catch(console.error);
    }
  }, []);

  // ─── Core hover logic (shared by both cursor sources) ─────────────────────
  // Extracted so it can be called from the ring:cursor listener (Rust polling)
  // and also from the fallback DOM mousemove (works when the window IS active,
  // e.g. after the user has clicked once).
  const updateHoverFromCoords = useCallback((clientX: number, clientY: number) => {
    if (!isVisibleRef.current) return;
    const c = centerRef.current;
    const dx = clientX - c.x;
    const dy = clientY - c.y;
    const dist  = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const scaleMult = (configRef.current?.ringScale || 100) / 100;
    const R_MAIN_  = 90  * scaleMult;
    const R_OUTER_ = 180 * scaleMult;  // not used here but kept for reference
    const DEAD_    = configRef.current?.deadzone || 30;

    if (dist < DEAD_) {
      setHoveredMainId(null);
      setHoveredChildId(null);
      return;
    }

    // Sub-ring zone: check children of the hovered folder first.
    if (hoveredMainRef.current && dist > R_MAIN_ + 40 * scaleMult) {
      const folder = slicesRef.current.find(s => s.id === hoveredMainRef.current);
      if (folder?.children?.length) {
        const folderIdx  = slicesRef.current.findIndex(s => s.id === hoveredMainRef.current);
        const parentAngle = -Math.PI / 2 + (folderIdx * 2 * Math.PI) / slicesRef.current.length;
        const step        = Math.PI / 6.5;
        const startAngle  = parentAngle - ((folder.children.length - 1) * step) / 2;

        let closestIdx = -1, minDiff = Infinity;
        folder.children.forEach((_, i) => {
          const ca = startAngle + i * step;
          const d  = Math.abs(Math.atan2(Math.sin(angle - ca), Math.cos(angle - ca)));
          if (d < minDiff) { minDiff = d; closestIdx = i; }
        });
        if (minDiff < step / 1.5) {
          setHoveredChildId(folder.children[closestIdx].id);
          return;
        }
      }
    }

    // Main ring zone.
    if (slicesRef.current.length > 0 && dist <= R_MAIN_ + 45 * scaleMult) {
      setHoveredChildId(null);
      const step      = (2 * Math.PI) / slicesRef.current.length;
      const origin    = -Math.PI / 2 - step / 2;
      const normalised = (((angle - origin) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const idx       = Math.min(Math.floor(normalised / step), slicesRef.current.length - 1);
      if (hoveredMainRef.current !== slicesRef.current[idx].id)
        setHoveredMainId(slicesRef.current[idx].id);
    }
  }, []);

  // ─── Tauri event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    loadData();

    const unlistenShow = listen("ring:show", (e: any) => {
      const { local_x, local_y } = e.payload;
      setIsVisible(false);
      loadData();
      setHoveredMainId(null);
      setHoveredChildId(null);
      setClickedId(null);
      mouseDownPosRef.current = null;
      summonTimeRef.current = Date.now();
      setCenter({ x: local_x, y: local_y });
      setAnimKey(k => k + 1);
      requestAnimationFrame(() => setIsVisible(true));
    });

    const unlistenHide = listen("ring:hide", () => {
      setIsVisible(false);
      setCenter({ x: -1000, y: -1000 });
      setHoveredMainId(null);
      setHoveredChildId(null);
      setTempProfileId(null);
      mouseDownPosRef.current = null;
    });

    // 🔑 THE KEY LISTENER — cursor position from Rust polling.
    // This fires even when the webview is not the active app.
    const unlistenCursor = listen<{ local_x: number; local_y: number }>(
      "ring:cursor",
      (e) => updateHoverFromCoords(e.payload.local_x, e.payload.local_y),
    );

    const unlistenKeyReleased = listen("ring:key_released", () => {
      if (Date.now() - summonTimeRef.current < 200) return;
      if (configRef.current?.triggerMode === "release")
        executeAction(hoveredMainRef.current, hoveredChildRef.current);
    });

    const unlistenSwitchProfile = listen<string>("switch_profile", (e) => {
      setTempProfileId(e.payload);
      setHoveredMainId(null);
      setHoveredChildId(null);
      setClickedId(null);
      setAnimKey(k => k + 1);
    });

    return () => {
      unlistenShow.then(f => f());
      unlistenHide.then(f => f());
      unlistenCursor.then(f => f());
      unlistenKeyReleased.then(f => f());
      unlistenSwitchProfile.then(f => f());
    };
  }, [executeAction, updateHoverFromCoords]);

  // ─── Fallback DOM mousemove ────────────────────────────────────────────────
  // Only fires when the window is actually active (e.g. after first click),
  // but doesn't hurt to keep for that case.
  useEffect(() => {
    const onMove = (e: MouseEvent) =>
      updateHoverFromCoords(e.clientX, e.clientY);
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [updateHoverFromCoords]);

  // ─── Click handling ────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // Guard: ignore the synthetic mouseup from the hotkey release.
    if (Date.now() - summonTimeRef.current < CLICK_GUARD_MS) return;
    // Guard: ignore drags.
    if (mouseDownPosRef.current) {
      const dx = e.clientX - mouseDownPosRef.current.x;
      const dy = e.clientY - mouseDownPosRef.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD_PX) {
        mouseDownPosRef.current = null;
        return;
      }
    }
    mouseDownPosRef.current = null;

    if (hoveredMainRef.current || hoveredChildRef.current)
      executeAction(hoveredMainRef.current, hoveredChildRef.current);
    else
      invoke("hide_action_ring").catch(console.error);
  }, [executeAction]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 w-screen h-screen select-none overflow-hidden"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.01)" }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <div
        key={animKey}
        className={`w-full h-full relative ${
          isVisible ? `opacity-100 ${animClass}` : "opacity-0 transition-none duration-0"
        }`}
      >
        {/* ── Centre X ──────────────────────────────────────────────────────── */}
        <div
          className="absolute flex items-center justify-center rounded-full bg-zinc-900/80 border border-white/10"
          style={{
            width: 46 * scaleMult, height: 46 * scaleMult,
            left: center.x, top: center.y,
            transform: "translate(-50%, -50%)", zIndex: 10,
          }}
        >
          <LucideIcons.X size={24 * scaleMult} strokeWidth={3} className="text-red-500" />
        </div>

        {/* ── Main ring slices ──────────────────────────────────────────────── */}
        {slices.map((slice, i) => {
          const angle   = -Math.PI / 2 + (i * 2 * Math.PI) / slices.length;
          const animType = config?.animSpeed || "spring";
          const targetX  = center.x + R_MAIN * Math.cos(angle);
          const targetY  = center.y + R_MAIN * Math.sin(angle);
          const nx = animType === "spring" ? (isVisible ? targetX : center.x) : targetX;
          const ny = animType === "spring" ? (isVisible ? targetY : center.y) : targetY;

          let tr = "";
          if (animType === "instant") tr = "none";
          if (animType === "fast")    tr = "all 0.15s ease-out";
          if (animType === "smooth")  tr = "all 0.3s ease-in-out";
          if (animType === "spring")  tr = "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";
          const delay = (isVisible && animType === "spring") ? `${i * 30}ms` : "0ms";

          const active    = hoveredMainId === slice.id;
          const isClicked = clickedId === slice.id;
          const Icon      = (LucideIcons as any)[slice.icon || "Zap"] || LucideIcons.Zap;
          const size      = isClicked ? NODE_SIZE - 10 * scaleMult : active ? NODE_SIZE_HOV : NODE_SIZE;
          const dimmed    = clickedId !== null && clickedId !== slice.id;

          return (
            <Fragment key={`wrapper-${slice.id}`}>
              {slice.actionType === "folder" && (
                <div
                  className="absolute pointer-events-none flex items-center justify-center z-20"
                  style={{
                    left: center.x + (R_MAIN + 40 * scaleMult) * Math.cos(angle),
                    top:  center.y + (R_MAIN + 40 * scaleMult) * Math.sin(angle),
                    transform: "translate(-50%, -50%)",
                    opacity: isVisible ? (dimmed ? 0.2 : 1) : 0,
                    transition: tr, transitionDelay: delay,
                  }}
                >
                  <LucideIcons.ChevronRight
                    size={(active ? 24 : 18) * scaleMult} strokeWidth={4}
                    className={`duration-200 ${active ? "text-current drop-shadow-md" : "text-zinc-500/80"}`}
                    style={{ transform: `rotate(${angle * (180 / Math.PI)}deg)` }}
                  />
                </div>
              )}

              <div
                className={`absolute pointer-events-none flex items-center justify-center rounded-full shadow-xl ${active ? activeTheme.ringColor : ""}`}
                style={{
                  width: size, height: size, left: nx, top: ny,
                  transform: `translate(-50%, -50%) scale(${isVisible ? 1 : animType === "instant" ? 1 : 0})`,
                  opacity: isVisible ? (dimmed ? 0.2 : 1) : 0,
                  backgroundColor: active ? (slice.color || "#6366f1") : (activeTheme.isDark ? "#27272a" : "#e4e4e7"),
                  color: active ? "white" : activeTheme.isDark ? "#d4d4d8" : "#3f3f46",
                  zIndex: active ? 30 : 20,
                  transition: tr, transitionDelay: delay,
                }}
              >
                <Icon size={active ? 28 * scaleMult : 22 * scaleMult} strokeWidth={active ? 2.5 : 3} />
              </div>

              <div
                className={`absolute px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-widest rounded-full border backdrop-blur-md whitespace-nowrap transition-all duration-200 pointer-events-none shadow-xl ${activeTheme.panel} ${activeTheme.border} ${activeTheme.text}`}
                style={{
                  left: nx, top: ny - 48 * scaleMult,
                  transform: "translate(-50%, -50%)",
                  opacity: active && !hoveredChildId ? 1 : 0,
                  boxShadow: slice.color ? `0 6px 20px ${slice.color}40` : "",
                }}
              >
                {slice.label}
              </div>
            </Fragment>
          );
        })}

        {/* ── Sub-ring (folder children) ────────────────────────────────────── */}
        {slices.map((folder, folderIdx) => {
          if (folder.actionType !== "folder") return null;
          const children = folder.children || [];
          if (!children.length) return null;

          const parentAngle  = -Math.PI / 2 + (folderIdx * 2 * Math.PI) / slices.length;
          const parentX      = center.x + R_MAIN * Math.cos(parentAngle);
          const parentY      = center.y + R_MAIN * Math.sin(parentAngle);
          const step         = Math.PI / 6.5;
          const startAngle   = parentAngle - ((children.length - 1) * step) / 2;
          const isFolderOpen = animFolderId === folder.id;

          return (
            <Fragment key={`folder-anim-${folder.id}`}>
              {children.map((child, i) => {
                const angle    = startAngle + i * step;
                const targetNx = center.x + R_OUTER * Math.cos(angle);
                const targetNy = center.y + R_OUTER * Math.sin(angle);
                const active   = hoveredChildId === child.id;
                const isClicked = clickedId === child.id;
                const Icon     = (LucideIcons as any)[child.icon || "Zap"] || LucideIcons.Zap;
                const size     = isClicked ? NODE_SIZE_CHILD - 10 * scaleMult : active ? NODE_SIZE_CHILD_HOV : NODE_SIZE_CHILD;
                const dimmed   = clickedId !== null && clickedId !== child.id;

                const animType = config?.animSpeed || "spring";
                let tr = "";
                if (animType === "instant") tr = "none";
                if (animType === "fast")    tr = "all 0.15s ease-out";
                if (animType === "smooth")  tr = "all 0.3s ease-in-out";
                if (animType === "spring")  tr = "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";

                return (
                  <div key={child.id} className="pointer-events-none">
                    <div
                      className={`absolute flex items-center justify-center rounded-full shadow-lg z-30 ${active && isFolderOpen ? activeTheme.ringColor : ""}`}
                      style={{
                        width: size, height: size,
                        left:  isFolderOpen ? targetNx : parentX,
                        top:   isFolderOpen ? targetNy : parentY,
                        transform: `translate(-50%, -50%) scale(${isFolderOpen ? 1 : 0.4})`,
                        opacity: isFolderOpen ? (dimmed ? 0.2 : 1) : 0,
                        backgroundColor: active && isFolderOpen ? (child.color || "#6366f1") : (activeTheme.isDark ? "#3f3f46" : "#f4f4f5"),
                        color: active && isFolderOpen ? "white" : activeTheme.isDark ? "#d4d4d8" : "#71717a",
                        transition: tr,
                        transitionDelay: (isFolderOpen && animType === "spring") ? `${i * 30}ms` : "0ms",
                      }}
                    >
                      <Icon size={active && isFolderOpen ? 26 * scaleMult : 20 * scaleMult} strokeWidth={active && isFolderOpen ? 2.5 : 3} />
                    </div>

                    <div
                      className={`absolute px-3 py-1 font-extrabold uppercase tracking-widest rounded-full border backdrop-blur-md whitespace-nowrap transition-all duration-200 pointer-events-none shadow-xl ${activeTheme.panel} ${activeTheme.border} ${activeTheme.text}`}
                      style={{
                        left: center.x + (R_OUTER + 65 * scaleMult) * Math.cos(angle),
                        top:  center.y + (R_OUTER + 55 * scaleMult) * Math.sin(angle),
                        transform: "translate(-50%, -50%)",
                        fontSize: `${9 * scaleMult}px`,
                        boxShadow: child.color ? `0 6px 20px ${child.color}40` : "0 6px 20px rgba(0,0,0,0.4)",
                        opacity: active && isFolderOpen ? 1 : 0,
                      }}
                    >
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