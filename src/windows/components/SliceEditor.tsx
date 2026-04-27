import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { X, Zap, Circle, FolderOpen, LayoutGrid, Clock, Trash2, Plus, GripVertical, Search, RefreshCw } from "lucide-react";
import { ICON_MAP, ICON_LIST } from "../IconMap";
import { ApiSlice, ActionTypeValue, ACCENT_PALETTE, ApiProfile } from "../ControlPanel";
import { ThemeStyle } from "../Theme";
import { invoke } from "@tauri-apps/api/core"; 
import tagsData from 'lucide-static/tags.json'; // 💥 อย่าลืมติดตั้ง npm install lucide-static ด้วยนะครับ

// 💥 ฟังก์ชันช่วยแปลงชื่อไอคอนสำหรับการหา Tags
const toKebabCase = (str: string) => str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const ACTION_TYPE_LABELS: Record<ActionTypeValue, string> = {
  shortcut: "Shortcut", launch: "Launch", script: "Script", folder: "Folder",
  text_snippet: "Snippet", media: "Media", system: "System", switch_profile: "Profile", multi_action: "Macro", open_app: "Open App",
  open_control_panel: "Settings",
};

const ACTION_TYPE_STYLES = {
  dark: {
    shortcut: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    launch: "bg-sky-500/10 text-sky-400 border-sky-500/30",
    script: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    folder: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    text_snippet: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    media: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30",
    system: "bg-slate-500/10 text-slate-400 border-slate-500/30",
    switch_profile: "bg-teal-500/10 text-teal-400 border-teal-500/30",
    multi_action: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    open_app: "bg-pink-500/10 text-pink-400 border-pink-500/30",
    open_control_panel: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  },
  light: {
    shortcut: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30 hover:bg-indigo-500/20",
    launch: "bg-sky-500/10 text-sky-600 border-sky-500/30 hover:bg-sky-500/20",
    script: "bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20",
    folder: "bg-rose-500/10 text-rose-600 border-rose-500/30 hover:bg-rose-500/20",
    text_snippet: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20",
    media: "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/30 hover:bg-fuchsia-500/20",
    system: "bg-slate-500/10 text-slate-600 border-slate-500/30 hover:bg-slate-500/20",
    switch_profile: "bg-teal-500/10 text-teal-600 border-teal-500/30 hover:bg-teal-500/20",
    multi_action: "bg-orange-500/10 text-orange-600 border-orange-500/30 hover:bg-orange-500/20",
    open_app: "bg-pink-500/10 text-pink-600 border-pink-500/30 hover:bg-pink-500/20",
    open_control_panel: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/20",
  }
};

const ACTION_DATA_PLACEHOLDERS: Record<ActionTypeValue, string> = {
  shortcut: "e.g. ctrl+c", launch: "e.g. https://google.com", script: "e.g. C:\\scripts\\run.bat",
  folder: "Items inside this folder appear in the outer ring.", text_snippet: "Type your text snippet here...",
  media: "", system: "", switch_profile: "", multi_action: "", open_app: "", open_control_panel: "",
};

const MEDIA_COMMANDS = [
  { value: "media_play_pause", label: "Play / Pause" }, { value: "media_next", label: "Next Track" },
  { value: "media_prev", label: "Previous Track" }, { value: "volume_up", label: "Volume Up" },
  { value: "volume_down", label: "Volume Down" }, { value: "volume_mute", label: "Mute Volume" },
  { value: "mic_mute", label: "Mute Mic" },
];

const SYSTEM_COMMANDS = [
  { value: "sys_sleep", label: "Sleep PC" }, { value: "sys_lock", label: "Lock Screen" },
  { value: "win_show_desktop", label: "Show Desktop" }, { value: "win_close", label: "Close Window" },
];

export default function SliceEditor({
  slice, onChange, onDelete, isChildItem, profiles, activeTheme 
}: {
  slice: ApiSlice; onChange: (updated: ApiSlice) => void; onDelete: () => void;
  isChildItem: boolean; profiles: ApiProfile[]; activeTheme: ThemeStyle;
}) {
  const labelRef = useRef<HTMLInputElement>(null);
  const actionInputRef = useRef<HTMLInputElement>(null);
  const iconSearchInputRef = useRef<HTMLInputElement>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // App Launcher States
  const [installedApps, setInstalledApps] = useState<{name: string, path: string}[]>([]);
  const [appSearchQuery, setAppSearchQuery] = useState("");
  const [isScanningApps, setIsScanningApps] = useState(false);
  const [hasFetchedApps, setHasFetchedApps] = useState(false);
  const [appDisplayLimit, setAppDisplayLimit] = useState(100);

  // Icon Picker States
  const [iconSearchQuery, setIconSearchQuery] = useState("");
  const [iconDisplayLimit, setIconDisplayLimit] = useState(100);

  const sliceRef = useRef(slice);

  useEffect(() => { 
    sliceRef.current = slice; 
  }, [slice]);
  
  useEffect(() => { 
    setAppSearchQuery(""); 
    setAppDisplayLimit(100);
    setIconSearchQuery("");
    setIconDisplayLimit(100);
  }, [slice.id]);

  useEffect(() => {
    setLiveMacro(null);
  }, [slice.actionType]);
  
  useEffect(() => { setAppDisplayLimit(100); }, [appSearchQuery]);
  useEffect(() => { if (showIconPicker) { setIconSearchQuery(""); setIconDisplayLimit(100); } }, [showIconPicker]);
  useEffect(() => { if (isRecording) actionInputRef.current?.focus(); }, [isRecording]);
  useEffect(() => { if (showIconPicker && iconSearchInputRef.current) {iconSearchInputRef.current.focus();}}, [showIconPicker]);
  
  const set = useCallback(<K extends keyof ApiSlice>(key: K, value: ApiSlice[K]) =>
      onChange({ ...sliceRef.current, [key]: value }), [onChange]);

  const CurrentIcon = (slice.icon && !['createLucideIcon', 'defaultAttributes', 'IconAliases'].includes(slice.icon) && ICON_MAP[slice.icon]) 
    ? ICON_MAP[slice.icon] 
    : Zap;

  // ─── Fetch Installed Apps ───
  useEffect(() => {
    if (slice.actionType === "open_app" && !hasFetchedApps && !isScanningApps) {
      setIsScanningApps(true);
      invoke<{name: string, path: string}[]>("get_installed_apps")
        .then(res => {
          if (Array.isArray(res)) setInstalledApps(res);
          else setInstalledApps([]);
        })
        .catch(err => {
          console.error("Fetch Apps Error:", err);
          setInstalledApps([]);
        })
        .finally(() => {
          setIsScanningApps(false);
          setHasFetchedApps(true); 
        });
    }
  }, [slice.actionType, hasFetchedApps, isScanningApps]);

  const handleAppListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      setAppDisplayLimit((prev) => prev + 100);
    }
  };

  // ─── Macro System ───
  const [recordingMacroId, setRecordingMacroId] = useState<string | null>(null);
  const [draggedMacroId, setDraggedMacroId] = useState<string | null>(null);
  const [liveMacro, setLiveMacro] = useState<any[] | null>(null);
  const [dragPos, setDragPos] = useState<{x: number, y: number} | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragWidth, setDragWidth] = useState(320);
  const [selectedMacroId, setSelectedMacroId] = useState<string | null>(null);
  const [copiedFlashId, setCopiedFlashId] = useState<string | null>(null);
  const liveMacroRef = useRef<any[] | null>(null);
  
  useEffect(() => { liveMacroRef.current = liveMacro; }, [liveMacro]);

  const macroSteps = useMemo(() => {
    if (slice.actionType !== "multi_action") return [];
    try {
      const parsed = JSON.parse(slice.actionData || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [slice.actionData, slice.actionType]);

  const displayMacro = liveMacro || macroSteps;

  const updateMacro = (steps: any[]) => set("actionData", JSON.stringify(steps));
  
  const addMacroStep = (type: string) => {
    updateMacro([...macroSteps, { id: Math.random().toString(36).slice(2), type, data: "" }]);
  };

  const updateStepData = (id: string, data: string) => {
    const next = liveMacro ? [...liveMacro] : [...macroSteps];
    const idx = next.findIndex(s => s.id === id);
    if (idx !== -1) { 
      next[idx].data = data; 
      updateMacro(next); 
      if (liveMacro) setLiveMacro(next); 
    }
  };

  const removeStep = (id: string) => {
    const next = liveMacro ? [...liveMacro] : [...macroSteps];
    const idx = next.findIndex(s => s.id === id);
    if (idx !== -1) { 
      next.splice(idx, 1); 
      updateMacro(next); 
      if (liveMacro) setLiveMacro(next); 
    }
  };

  useEffect(() => {
    if (slice.actionType !== "multi_action") return;
    const handleGlobalKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      
      let currentSteps = [];
      try {
        const parsed = JSON.parse(sliceRef.current.actionData || "[]");
        currentSteps = Array.isArray(parsed) ? parsed : [];
      } catch {}
      currentSteps = liveMacroRef.current || currentSteps;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (selectedMacroId) {
          const stepToCopy = currentSteps.find((s: any) => s.id === selectedMacroId);
          if (stepToCopy) {
            localStorage.setItem("actionRing_copiedMacro", JSON.stringify(stepToCopy));
            setCopiedFlashId(stepToCopy.id);
            setTimeout(() => setCopiedFlashId(null), 300);
          }
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        const copiedStr = localStorage.getItem("actionRing_copiedMacro");
        if (copiedStr) {
          try {
            const copiedStep = JSON.parse(copiedStr);
            copiedStep.id = Math.random().toString(36).slice(2);
            const next = [...currentSteps];
            const targetIdx = next.findIndex((s: any) => s.id === selectedMacroId);
            if (targetIdx !== -1) next.splice(targetIdx + 1, 0, copiedStep);
            else next.push(copiedStep);
            updateMacro(next);
            if (liveMacroRef.current) setLiveMacro(next);
            setSelectedMacroId(copiedStep.id);
          } catch (err) { console.error(err); }
        }
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedMacroId) {
          const next = currentSteps.filter((s: any) => s.id !== selectedMacroId);
          updateMacro(next);
          if (liveMacroRef.current) setLiveMacro(next);
          setSelectedMacroId(null);
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [selectedMacroId, slice.actionType]);

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setSelectedMacroId(id);
    const rowEl = (e.currentTarget as HTMLElement).closest("[data-step-id]");
    if (rowEl) {
      const rect = rowEl.getBoundingClientRect();
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setDragWidth(rect.width);
    }
    setDraggedMacroId(id);
    setLiveMacro([...macroSteps]);
    setDragPos({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!draggedMacroId) { document.body.style.cursor = ""; return; }
    document.body.style.cursor = "grabbing";

    const onMove = (e: PointerEvent) => {
      setDragPos({ x: e.clientX, y: e.clientY });
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const targetEl = el?.closest("[data-step-id]");
      if (targetEl) {
        const targetId = targetEl.getAttribute("data-step-id");
        if (targetId && targetId !== draggedMacroId) {
          setLiveMacro(prev => {
            if (!prev) return prev;
            const next = [...prev];
            const from = next.findIndex(s => s.id === draggedMacroId);
            const to = next.findIndex(s => s.id === targetId);
            if (from !== -1 && to !== -1) {
              const [moved] = next.splice(from, 1);
              next.splice(to, 0, moved);
            }
            return next;
          });
        }
      }
    };

    const onUp = () => {
      if (liveMacroRef.current) updateMacro(liveMacroRef.current);
      setDraggedMacroId(null); setLiveMacro(null); setDragPos(null);
      document.body.style.cursor = "";
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.style.cursor = "";
    };
  }, [draggedMacroId]);

  const handleMacroShortcutRecord = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    e.preventDefault();
    if (e.key === "Escape") { setRecordingMacroId(null); return; }
    const keys: string[] = [];
    if (e.ctrlKey) keys.push("ctrl"); if (e.altKey) keys.push("alt");
    if (e.shiftKey) keys.push("shift"); if (e.metaKey) keys.push("cmd");
    if (!["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
      let keyName = e.key.toLowerCase(); if (keyName === " ") keyName = "space";
      keys.push(keyName); updateStepData(id, keys.join("+")); setRecordingMacroId(null);
    }
  };

  const handleBrowse = async () => {
    try { const selectedPath = await open({ multiple: false, directory: false }); if (selectedPath) set("actionData", selectedPath as string); } 
    catch (err) { console.error("Browse error:", err); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isRecording) return; e.preventDefault();
    if (e.key === "Escape") { setIsRecording(false); return; }
    const keys: string[] = [];
    if (e.ctrlKey) keys.push("ctrl"); if (e.altKey) keys.push("alt");
    if (e.shiftKey) keys.push("shift"); if (e.metaKey) keys.push("cmd");
    if (!["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
      let keyName = e.key.toLowerCase(); if (keyName === " ") keyName = "space";
      keys.push(keyName); set("actionData", keys.join("+")); setIsRecording(false);
    }
  };

  const focusClass = activeTheme.isDark 
    ? "focus:border-white/40 focus:ring-1 focus:ring-white/20" 
    : "focus:border-black/40 focus:ring-1 focus:ring-black/10";

  let selectedPaths: string[] = [];
  if (slice.actionType === "open_app") {
    try { 
      const parsed = JSON.parse(slice.actionData || "[]");
      selectedPaths = Array.isArray(parsed) ? parsed : [];
    } catch { selectedPaths = []; }
  }

  const safeSearchQuery = (appSearchQuery || "").toLowerCase();
  const safeInstalledApps = Array.isArray(installedApps) ? installedApps : [];
  
  const filteredApps = safeInstalledApps.filter(app => 
    app && typeof app.name === "string" && app.name.toLowerCase().includes(safeSearchQuery)
  );

  const toggleApp = (path: string) => {
    const next = selectedPaths.includes(path)
      ? selectedPaths.filter(p => p !== path)
      : [...selectedPaths, path];
    set("actionData", JSON.stringify(next));
  };

  const removeApp = (path: string) => {
    set("actionData", JSON.stringify(selectedPaths.filter(p => p !== path)));
  };

  const getAppName = (path: string) => {
    const found = safeInstalledApps.find(a => a.path === path);
    if (found && found.name) return found.name;
    return typeof path === "string" ? path.split('\\').pop()?.split('/').pop() || path : "Unknown App";
  };

  const availableTypes: ActionTypeValue[] = isChildItem
    ? ["shortcut", "launch", "script", "text_snippet", "media", "system", "switch_profile", "open_app", "open_control_panel"]
    : ["shortcut", "launch", "script", "folder", "text_snippet", "media", "system", "switch_profile", "multi_action", "open_app", "open_control_panel"];

  const hasChildren = slice.actionType === "folder" && (slice.children?.length ?? 0) > 0;
  const formatDisplayData = (type: string, data: string) => {
    if (!data) return "";
    // ถ้าเป็นลิงก์เปิดแอป หรือ สคริปต์ ไม่ต้องแปลงตัวอักษร
    if (type !== "shortcut") return data; 
    
    // เช็คว่ารันบน Windows อยู่หรือไม่
    const isWindows = navigator.userAgent.toLowerCase().includes('windows');
    
    if (isWindows) {
      return data.replace(/cmd|command|meta/g, "win");
    } else {
      return data.replace(/win|meta/g, "cmd");
    }
  };

  return (
    <div className="min-h-full flex flex-col pt-8 px-8 pb-32 space-y-7 transition-colors duration-500 bg-transparent" onClick={() => setSelectedMacroId(null)}>
      
      {/* Ghost Element สำหรับลาก Macro */}
      {draggedMacroId && dragPos && (() => {
        const step = displayMacro.find(s => s?.id === draggedMacroId);
        if (!step) return null;
        const stepType = step.type || "unknown";
        return (
          <div className={`fixed pointer-events-none z-[9999] flex items-center gap-3 border rounded-xl p-2.5 shadow-[0_0_40px_rgba(249,115,22,0.2)] scale-105 transition-transform origin-top-left ${activeTheme.panel} border-orange-500/80 backdrop-blur-xl`}
               style={{ left: dragPos.x - dragOffset.x, top: dragPos.y - dragOffset.y, width: dragWidth, margin: 0 }}>
            <div className="flex flex-col items-center justify-center w-8 shrink-0"><GripVertical size={20} className="text-orange-500 animate-pulse" /></div>
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[9px] font-bold text-orange-500 uppercase tracking-wider">{stepType.replace("_", " ")}</span>
              <div className={`w-full border rounded-lg px-3 py-1.5 text-xs font-mono ${activeTheme.isDark ? 'bg-black/40 border-orange-500/30 text-zinc-400' : 'bg-white/60 border-orange-300 text-zinc-600'}`}>{step.data || "..."}</div>
            </div>
          </div>
        );
      })()}

      {/* Configuration Header */}
      <div className={`flex items-center justify-between border-b pb-4 ${activeTheme.isDark ? 'border-white/10' : 'border-black/10'}`}>
        <h3 className="text-[11px] font-bold tracking-[0.2em] uppercase opacity-50 text-current">Configuration</h3>
        <button type="button" onClick={onDelete} className="text-xs font-bold text-red-500 hover:text-red-400 bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20 transition-all active:scale-95">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-8">
        
        {/* Name & Icon Row */}
        <div className="flex gap-4 items-end">
          <div className="flex-1 space-y-2">
            <label className="block text-[10px] font-bold opacity-50 uppercase tracking-widest text-current">Display Label</label>
            <input 
              ref={labelRef} type="text" value={slice.label} onChange={(e) => set("label", e.target.value)} 
              placeholder="e.g. Open Browser" 
              className={`w-full bg-transparent border ${activeTheme.border} rounded-xl px-4 py-2.5 text-sm text-current focus:outline-none transition-all placeholder-current placeholder-opacity-30 ${focusClass}`} 
            />
          </div>
          <div className="space-y-2 relative">
            <label className="block text-[10px] font-bold opacity-50 uppercase tracking-widest text-center text-current">Icon</label>
            <button 
              type="button"
              onClick={() => setShowIconPicker(!showIconPicker)} 
              className={`w-14 h-[42px] border rounded-xl flex items-center justify-center transition-all ${
                showIconPicker ? `border-current shadow-lg ${activeTheme.isDark ? 'bg-white/10' : 'bg-black/5'}` : `bg-transparent ${activeTheme.border} opacity-70 hover:opacity-100`
              }`}
            >
              <CurrentIcon size={20} strokeWidth={2.5} />
            </button>
            
            {/* 💥 Icon Picker - แก้ไขระบบกรอง Tags แล้ว 💥 */}
            {showIconPicker && (
              <div className={`absolute top-full mt-2 right-0 z-[100] p-4 border rounded-2xl shadow-2xl w-[320px] animate-in zoom-in-95 duration-200 ${activeTheme.panel} ${activeTheme.border} backdrop-blur-2xl`}>
                <div className="mb-3 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 text-current" />
                  <input 
                    ref={iconSearchInputRef}
                    type="text" 
                    placeholder="Search icons (e.g. ai, web, edit)..." 
                    value={iconSearchQuery}
                    onChange={(e) => setIconSearchQuery(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border ${activeTheme.border} bg-transparent focus:outline-none transition-all placeholder-current placeholder-opacity-30 text-current ${focusClass}`}
                  />
                </div>

                <div 
                  className="grid grid-cols-6 gap-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar"
                  onScroll={(e) => {
                    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                    if (scrollHeight - scrollTop <= clientHeight + 50) setIconDisplayLimit(prev => prev + 100);
                  }}
                >
                  {(() => {
                    // กรองไอคอนด้วยชื่อ และ Tags
                    const query = iconSearchQuery.toLowerCase();
                    const filteredIcons = ICON_LIST.filter(iconName => {
                      if (['createLucideIcon', 'defaultAttributes', 'IconAliases', 'icons'].includes(iconName)) return false;
                      
                      const matchName = iconName.toLowerCase().includes(query);
                      const kebabName = toKebabCase(iconName);
                      // @ts-ignore
                      const tags: string[] = tagsData[kebabName] || [];
                      const matchTags = tags.some(tag => tag.toLowerCase().includes(query));

                      return matchName || matchTags;
                    });

                    if (filteredIcons.length === 0) return <div className="col-span-6 text-center text-xs opacity-50 py-4 text-current">No icons found.</div>;
                    
                    return filteredIcons.slice(0, iconDisplayLimit).map((iconName) => {
                      const IconComp = ICON_MAP[iconName];
                      if (!IconComp) return null;

                      return (
                        <button 
                          type="button"
                          key={iconName} 
                          title={iconName}
                          onClick={() => { set("icon", iconName); setShowIconPicker(false); }} 
                          className={`p-2.5 flex items-center justify-center rounded-lg transition-all ${
                            slice.icon === iconName 
                              ? (activeTheme.isDark ? "bg-white text-black shadow-md" : "bg-black text-white shadow-md") 
                              : `opacity-60 hover:opacity-100 ${activeTheme.isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`
                          }`}
                        >
                          <IconComp size={18} />
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Theme Color Picker */}
        <div className="space-y-3">
          <label className="block text-[10px] font-bold opacity-50 uppercase tracking-widest text-current">Theme Color</label>
          <div className={`border p-4 rounded-2xl flex items-center gap-5 transition-colors ${activeTheme.isDark ? 'bg-black/20 border-white/10' : 'bg-white/40 border-black/10 shadow-sm'}`}>
            <div className="relative w-11 h-11 shrink-0">
              <input type="color" value={slice.color || "#6366f1"} onChange={(e) => set("color", e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10" />
              <div className={`w-full h-full rounded-full border-2 transition-transform hover:scale-110 ${activeTheme.isDark ? 'border-zinc-700' : 'border-white'}`} style={{ backgroundColor: slice.color || "#6366f1", boxShadow: `0 0 15px ${slice.color}40` }} />
            </div>
            <div className="flex flex-wrap gap-2.5">
              {ACCENT_PALETTE.map((c) => <button type="button" key={c} onClick={() => set("color", c)} className={`w-5 h-5 rounded-md border-2 transition-all hover:scale-125 ${slice.color === c ? (activeTheme.isDark ? "border-white" : "border-black shadow-md") : "border-transparent"}`} style={{ backgroundColor: c }} />)}
            </div>
          </div>
        </div>

        {/* Action Type Selector */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="block text-[10px] font-bold opacity-50 uppercase tracking-widest text-current">Action Type</label>
            {hasChildren && <span className="text-[10px] text-rose-500 font-medium animate-pulse">Items inside • Cannot change</span>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {availableTypes.map((t) => (
              <button 
                type="button"
                key={t} disabled={hasChildren && t !== "folder"} 
                onClick={() => onChange({ ...slice, actionType: t, actionData: t === "folder" || t === "open_app" || t === "multi_action" ? "[]" : "" })} 
                className={`py-2.5 rounded-xl text-[10px] font-extrabold border transition-all ${
                  slice.actionType === t 
                    ? ACTION_TYPE_STYLES[activeTheme.isDark ? 'dark' : 'light'][t as keyof typeof ACTION_TYPE_STYLES['dark']] + " border-current shadow-sm" 
                    : `bg-transparent ${activeTheme.border} opacity-50 hover:opacity-100`
                } ${hasChildren && t !== "folder" ? "opacity-20 cursor-not-allowed" : "active:scale-95"}`}
              >
                {ACTION_TYPE_LABELS[t as keyof typeof ACTION_TYPE_LABELS]}
              </button>
            ))}
          </div>
        </div>

        {/* --- Dynamic Content Area --- */}
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          
          {/* 1. Open App Launcher */}
          {slice.actionType === "multi_action" && (
             <div 
               className={`w-full space-y-3 pt-5 px-5 pb-10 border rounded-2xl animate-in fade-in duration-300 transition-colors ${activeTheme.isDark ? 'bg-black/20 border-white/10' : 'bg-white/40 border-black/10 shadow-sm'}`}
               onClick={(e) => e.stopPropagation()}
             >
               <div className={`flex items-center justify-between mb-2 pb-3 border-b ${activeTheme.isDark ? 'border-white/10' : 'border-black/10'}`}>
                 <h4 className="text-[11px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-2">
                   <LayoutGrid size={14} /> Macro Sequence
                 </h4>
                 <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${activeTheme.isDark ? 'text-zinc-400 bg-white/10' : 'text-zinc-600 bg-black/5'}`}>{displayMacro.length} Steps</span>
               </div>

               <div className="space-y-2">
                 {displayMacro.map((step, idx) => {
                   if (!step || typeof step !== 'object') return null;
                   const stepType = step.type || "unknown";
                   
                   return (
                     <div 
                       key={step.id || `macro-${idx}`} 
                       data-step-id={step.id}
                       onClick={(e) => { e.stopPropagation(); setSelectedMacroId(step.id); }}
                       className={`flex items-center gap-3 border rounded-xl p-2.5 group transition-all duration-200 ease-out cursor-default
                         ${draggedMacroId === step.id ? "opacity-0 scale-95" : "opacity-100 scale-100"}
                         ${copiedFlashId === step.id ? "border-emerald-500 bg-emerald-500/10 shadow-lg" : 
                           selectedMacroId === step.id ? "border-indigo-500 bg-indigo-500/5 shadow-md" : `${activeTheme.panel} ${activeTheme.border} hover:border-current`}
                       `}
                     >
                       <div className="flex flex-col items-center justify-center w-8 shrink-0">
                         <span className={`text-[8px] font-black mb-1 px-1.5 py-0.5 rounded ${activeTheme.isDark ? 'bg-white/10 text-zinc-400' : 'bg-black/5 text-zinc-500'}`}>#{idx + 1}</span>
                         {stepType === "delay" ? <Clock size={14} className="text-blue-500" /> :
                          stepType === "shortcut" ? <Zap size={14} className="text-indigo-500" /> :
                          stepType === "text_snippet" ? <LayoutGrid size={14} className="text-emerald-500" /> : <FolderOpen size={14} className="text-sky-500" />}
                       </div>
                       
                       <div className="flex-1 flex flex-col gap-1">
                          <span className="text-[9px] font-bold opacity-60 uppercase tracking-wider text-current">{stepType.replace("_", " ")}</span>
                          {stepType === "delay" ? (
                            <div className="flex items-center gap-2">
                              <input type="number" value={step.data || ""} onChange={(e) => updateStepData(step.id, e.target.value)} placeholder="e.g. 500" className={`w-24 bg-transparent border rounded-lg px-3 py-1.5 text-xs text-current focus:outline-none transition-all font-mono ${activeTheme.border} ${focusClass}`} />
                              <span className="text-xs opacity-50">ms</span>
                            </div>
                          ) : stepType === "shortcut" ? (
                            // 💥 1. เอา formatDisplayData มาครอบตรงนี้ (step.data)
                            <input 
                              type="text" 
                              value={recordingMacroId === step.id ? "Listening..." : formatDisplayData("shortcut", step.data || "")} 
                              onClick={() => setRecordingMacroId(step.id)} 
                              onBlur={() => setRecordingMacroId(null)} 
                              onKeyDown={(e) => handleMacroShortcutRecord(e, step.id)} 
                              readOnly 
                              className={`w-full bg-transparent border rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none transition-all ${recordingMacroId === step.id ? "border-red-500 text-red-500 animate-pulse" : `${activeTheme.border} text-current`} ${focusClass}`} 
                            />
                          ) : (
                            <input type="text" value={step.data || ""} onChange={(e) => updateStepData(step.id, e.target.value)} placeholder={`Enter ${stepType} data...`} className={`w-full bg-transparent border rounded-lg px-3 py-1.5 text-xs text-current focus:outline-none transition-all font-mono ${activeTheme.border} ${focusClass}`} />
                          )}
                       </div>

                       <div className="flex items-center gap-1 shrink-0 opacity-20 group-hover:opacity-100 transition-opacity">
                         <button type="button" onClick={(e) => { e.stopPropagation(); removeStep(step.id); }} className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors"><Trash2 size={14} /></button>
                         <div className="p-1.5 opacity-60 hover:opacity-100 cursor-grab active:cursor-grabbing touch-none" onPointerDown={(e) => handlePointerDown(e, step.id)}><GripVertical size={16} /></div>
                       </div>
                     </div>
                   );
                 })}
                 
                 {displayMacro.length === 0 && (
                   <div className={`text-center py-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${activeTheme.isDark ? 'border-white/10 hover:border-white/30' : 'border-black/10 hover:border-black/30'}`}>
                     <LayoutGrid size={24} className="mx-auto opacity-40 mb-2" />
                     <p className="opacity-60 text-xs font-medium">No actions in this macro yet.</p>
                   </div>
                 )}
               </div>

               <div className={`pt-2 mt-4 border-t ${activeTheme.isDark ? 'border-white/10' : 'border-black/10'}`}>
                 <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest mt-4 mb-4 text-center text-current">Add New Step</p>
                 <div className="flex flex-wrap justify-center gap-2">
                   {["shortcut", "launch", "text_snippet", "delay"].map(type => (
                     <button type="button" key={type} onClick={() => addMacroStep(type)} className={`px-3 py-2 border rounded-xl text-[10px] font-bold transition-all capitalize flex items-center gap-1.5 ${activeTheme.isDark ? 'bg-white/5 border-white/10 hover:border-orange-500/50 hover:bg-orange-500/10 text-zinc-300 hover:text-orange-400' : 'bg-black/5 border-black/10 hover:border-orange-500 hover:text-orange-600 shadow-sm'}`}>
                       <Plus size={10} strokeWidth={3} /> {type.replace("_", " ")}
                     </button>
                   ))}
                 </div>
               </div>
             </div>
          )}

          {/* 2. Open Settings (Control Panel) */}
          {slice.actionType === "open_control_panel" && (
            <div className={`w-full bg-transparent border ${activeTheme.border} rounded-2xl p-6 text-center opacity-60 text-sm border-dashed`}>
              <p>This button will bring up the</p>
              <p className="font-bold text-yellow-500 mt-1">Action Ring Control Panel</p>
              <p className="text-[10px] mt-2 italic">Use this if you accidentally close the dashboard.</p>
            </div>
          )}

          {/* 3. Text Snippet */}
          {slice.actionType === "text_snippet" && (
            <textarea 
              value={slice.actionData || ""} 
              onChange={(e) => set("actionData", e.target.value)} 
              placeholder="Type the text you want to auto-type..." 
              className={`w-full h-32 bg-transparent border ${activeTheme.border} rounded-2xl p-4 text-sm text-current focus:outline-none resize-none transition-all custom-scrollbar placeholder-current placeholder-opacity-30 ${focusClass}`} 
            />
          )}
          
          {/* 4. Media Commands */}
          {slice.actionType === "media" && (
            <select value={slice.actionData || ""} onChange={(e) => set("actionData", e.target.value)} className={`w-full bg-transparent border ${activeTheme.border} rounded-xl p-3 text-sm text-current focus:outline-none cursor-pointer appearance-none ${focusClass}`}>
              <option value="" disabled>Choose a media command...</option>
              {MEDIA_COMMANDS.map(cmd => <option key={cmd.value} value={cmd.value} className={activeTheme.isDark ? "bg-[#0c0c0e]" : "bg-white"}>{cmd.label}</option>)}
            </select>
          )}

          {/* 5. System Commands */}
          {slice.actionType === "system" && (
            <select value={slice.actionData || ""} onChange={(e) => set("actionData", e.target.value)} className={`w-full bg-transparent border ${activeTheme.border} rounded-xl p-3 text-sm text-current focus:outline-none cursor-pointer appearance-none ${focusClass}`}>
              <option value="" disabled>Choose a system command...</option>
              {SYSTEM_COMMANDS.map(cmd => <option key={cmd.value} value={cmd.value} className={activeTheme.isDark ? "bg-[#0c0c0e]" : "bg-white"}>{cmd.label}</option>)}
            </select>
          )}

          {/* 6. Profile Switching */}
          {slice.actionType === "switch_profile" && (
            <select value={slice.actionData || ""} onChange={(e) => set("actionData", e.target.value)} className={`w-full bg-transparent border ${activeTheme.border} rounded-xl p-3 text-sm text-current focus:outline-none cursor-pointer appearance-none ${focusClass}`}>
              <option value="" disabled>Switch to Profile...</option>
              {profiles.map(p => <option key={p.id} value={p.id} className={activeTheme.isDark ? "bg-[#0c0c0e]" : "bg-white"}>{p.name} {p.isDefault ? "• Default" : ""}</option>)}
            </select>
          )}
          
          {/* 7. Basic Commands (Shortcut, Launch, Script) */}
          {["shortcut", "launch", "script"].includes(slice.actionType) && (
            <div className="flex gap-2">
              <input 
                ref={actionInputRef} 
                type="text" 
                readOnly={isRecording} 
                value={isRecording ? "Listening..." : formatDisplayData(slice.actionType, slice.actionData || "")}
                onChange={(e) => set("actionData", slice.actionType === "shortcut" ? e.target.value.toLowerCase() : e.target.value)} 
                
                onKeyDown={handleKeyDown} 
                placeholder={ACTION_DATA_PLACEHOLDERS[slice.actionType as keyof typeof ACTION_DATA_PLACEHOLDERS]} 
                className={`flex-1 bg-transparent border rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none transition-all placeholder-current placeholder-opacity-30 ${isRecording ? "border-red-500/50 text-red-500 ring-2 ring-red-500/20 animate-pulse" : `${activeTheme.border} text-current ${focusClass}`}`} 
              />
              
              {slice.actionType === "shortcut" ? (
                <button type="button" onClick={() => setIsRecording(!isRecording)} className={`px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${isRecording ? "bg-red-500/20 text-red-500 border border-red-500/30" : `bg-transparent opacity-60 hover:opacity-100 border ${activeTheme.border}`}`}>
                  {isRecording ? <X size={14} /> : <Circle size={12} className="fill-red-500 text-red-500" />} {isRecording ? "Cancel" : "Record"}
                </button>
              ) : (
                <button type="button" onClick={handleBrowse} className={`px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all bg-transparent opacity-60 hover:opacity-100 border ${activeTheme.border}`}>
                  <FolderOpen size={14} /> Browse
                </button>
              )}
            </div>
          )}
          {/* 8. Macro Builder */}
          {slice.actionType === "multi_action" && (
             <div 
               className={`w-full space-y-3 pt-5 px-5 pb-10 border rounded-2xl animate-in fade-in duration-300 transition-colors ${activeTheme.isDark ? 'bg-black/20 border-white/10' : 'bg-white/40 border-black/10 shadow-sm'}`}
               onClick={(e) => e.stopPropagation()}
             >
               <div className={`flex items-center justify-between mb-2 pb-3 border-b ${activeTheme.isDark ? 'border-white/10' : 'border-black/10'}`}>
                 <h4 className="text-[11px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-2">
                   <LayoutGrid size={14} /> Macro Sequence
                 </h4>
                 <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${activeTheme.isDark ? 'text-zinc-400 bg-white/10' : 'text-zinc-600 bg-black/5'}`}>{displayMacro.length} Steps</span>
               </div>

               <div className="space-y-2">
                 {displayMacro.map((step, idx) => {
                   if (!step || typeof step !== 'object') return null;
                   const stepType = step.type || "unknown";
                   
                   return (
                     <div 
                       key={step.id || `macro-${idx}`} 
                       data-step-id={step.id}
                       onClick={(e) => { e.stopPropagation(); setSelectedMacroId(step.id); }}
                       className={`flex items-center gap-3 border rounded-xl p-2.5 group transition-all duration-200 ease-out cursor-default
                         ${draggedMacroId === step.id ? "opacity-0 scale-95" : "opacity-100 scale-100"}
                         ${copiedFlashId === step.id ? "border-emerald-500 bg-emerald-500/10 shadow-lg" : 
                           selectedMacroId === step.id ? "border-indigo-500 bg-indigo-500/5 shadow-md" : `${activeTheme.panel} ${activeTheme.border} hover:border-current`}
                       `}
                     >
                       <div className="flex flex-col items-center justify-center w-8 shrink-0">
                         <span className={`text-[8px] font-black mb-1 px-1.5 py-0.5 rounded ${activeTheme.isDark ? 'bg-white/10 text-zinc-400' : 'bg-black/5 text-zinc-500'}`}>#{idx + 1}</span>
                         {stepType === "delay" ? <Clock size={14} className="text-blue-500" /> :
                          stepType === "shortcut" ? <Zap size={14} className="text-indigo-500" /> :
                          stepType === "text_snippet" ? <LayoutGrid size={14} className="text-emerald-500" /> : <FolderOpen size={14} className="text-sky-500" />}
                       </div>
                       
                       <div className="flex-1 flex flex-col gap-1">
                          <span className="text-[9px] font-bold opacity-60 uppercase tracking-wider text-current">{stepType.replace("_", " ")}</span>
                          {stepType === "delay" ? (
                            <div className="flex items-center gap-2">
                              <input type="number" value={step.data || ""} onChange={(e) => updateStepData(step.id, e.target.value)} placeholder="e.g. 500" className={`w-24 bg-transparent border rounded-lg px-3 py-1.5 text-xs text-current focus:outline-none transition-all font-mono ${activeTheme.border} ${focusClass}`} />
                              <span className="text-xs opacity-50">ms</span>
                            </div>
                          ) : stepType === "shortcut" ? (
                            <input type="text" value={recordingMacroId === step.id ? "Listening..." : (step.data || "")} onClick={() => setRecordingMacroId(step.id)} onBlur={() => setRecordingMacroId(null)} onKeyDown={(e) => handleMacroShortcutRecord(e, step.id)} readOnly className={`w-full bg-transparent border rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none transition-all ${recordingMacroId === step.id ? "border-red-500 text-red-500 animate-pulse" : `${activeTheme.border} text-current`} ${focusClass}`} />
                          ) : (
                            <input type="text" value={step.data || ""} onChange={(e) => updateStepData(step.id, e.target.value)} placeholder={`Enter ${stepType} data...`} className={`w-full bg-transparent border rounded-lg px-3 py-1.5 text-xs text-current focus:outline-none transition-all font-mono ${activeTheme.border} ${focusClass}`} />
                          )}
                       </div>

                       <div className="flex items-center gap-1 shrink-0 opacity-20 group-hover:opacity-100 transition-opacity">
                         <button type="button" onClick={(e) => { e.stopPropagation(); removeStep(step.id); }} className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors"><Trash2 size={14} /></button>
                         <div className="p-1.5 opacity-60 hover:opacity-100 cursor-grab active:cursor-grabbing touch-none" onPointerDown={(e) => handlePointerDown(e, step.id)}><GripVertical size={16} /></div>
                       </div>
                     </div>
                   );
                 })}
                 
                 {displayMacro.length === 0 && (
                   <div className={`text-center py-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${activeTheme.isDark ? 'border-white/10 hover:border-white/30' : 'border-black/10 hover:border-black/30'}`}>
                     <LayoutGrid size={24} className="mx-auto opacity-40 mb-2" />
                     <p className="opacity-60 text-xs font-medium">No actions in this macro yet.</p>
                   </div>
                 )}
               </div>

               <div className={`pt-2 mt-4 border-t ${activeTheme.isDark ? 'border-white/10' : 'border-black/10'}`}>
                 <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest mt-4 mb-4 text-center text-current">Add New Step</p>
                 <div className="flex flex-wrap justify-center gap-2">
                   {["shortcut", "launch", "text_snippet", "delay"].map(type => (
                     <button type="button" key={type} onClick={() => addMacroStep(type)} className={`px-3 py-2 border rounded-xl text-[10px] font-bold transition-all capitalize flex items-center gap-1.5 ${activeTheme.isDark ? 'bg-white/5 border-white/10 hover:border-orange-500/50 hover:bg-orange-500/10 text-zinc-300 hover:text-orange-400' : 'bg-black/5 border-black/10 hover:border-orange-500 hover:text-orange-600 shadow-sm'}`}>
                       <Plus size={10} strokeWidth={3} /> {type.replace("_", " ")}
                     </button>
                   ))}
                 </div>
               </div>
             </div>
          )}

        </div>
      </div>
      <div className="h-40 shrink-0" />
    </div>
  );
}