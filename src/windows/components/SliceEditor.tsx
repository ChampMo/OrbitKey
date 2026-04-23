import React, { useCallback, useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { X, Zap, Circle, FolderOpen, LayoutGrid, Clock, Trash2, Plus, GripVertical } from "lucide-react";
import { ICON_MAP, ICON_LIST } from "../IconMap";
import { ApiSlice, ActionTypeValue, ACCENT_PALETTE, ApiProfile } from "../ControlPanel";
// 💥 นำเข้า ThemeStyle
import { ThemeStyle } from "../Theme";

const ACTION_TYPE_LABELS: Record<ActionTypeValue, string> = {
  shortcut: "Shortcut", launch: "Launch", script: "Script", folder: "Folder",
  text_snippet: "Snippet", media: "Media", system: "System", switch_profile: "Profile", multi_action: "Macro",
};

// 💥 แยกชุดสีของปุ่ม Action Type ให้รองรับ Dark / Light
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
  }
};

const ACTION_DATA_PLACEHOLDERS: Record<ActionTypeValue, string> = {
  shortcut: "e.g. ctrl+c", launch: "e.g. https://google.com", script: "e.g. C:\\scripts\\run.bat",
  folder: "Items inside this folder appear in the outer ring.", text_snippet: "Type your text snippet here...",
  media: "", system: "", switch_profile: "", multi_action: "",
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
  slice, onChange, onDelete, isChildItem, profiles, activeTheme // 💥 รับ activeTheme
}: {
  slice: ApiSlice; onChange: (updated: ApiSlice) => void; onDelete: () => void;
  isChildItem: boolean; profiles: ApiProfile[]; activeTheme: ThemeStyle;
}) {
  const labelRef = useRef<HTMLInputElement>(null);
  const actionInputRef = useRef<HTMLInputElement>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const sliceRef = useRef(slice);
  useEffect(() => { sliceRef.current = slice; }, [slice]);
  useEffect(() => { if (isRecording) actionInputRef.current?.focus(); }, [isRecording]);

  const set = useCallback(<K extends keyof ApiSlice>(key: K, value: ApiSlice[K]) =>
      onChange({ ...sliceRef.current, [key]: value }), [onChange]);

  const CurrentIcon = ICON_MAP[slice.icon || "Zap"] || Zap;

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

  const getLatestMacro = () => {
    try { const parsed = JSON.parse(sliceRef.current.actionData || "[]"); return Array.isArray(parsed) ? parsed : []; } 
    catch { return []; }
  };

  const macroSteps = slice.actionType === "multi_action" ? (() => {
    try { const parsed = JSON.parse(slice.actionData || "[]"); return Array.isArray(parsed) ? parsed : []; } 
    catch { return []; }
  })() : [];
  
  const displayMacro = liveMacro || macroSteps;

  const updateMacro = (steps: any[]) => set("actionData", JSON.stringify(steps));
  const addMacroStep = (type: string) => updateMacro([...macroSteps, { id: Math.random().toString(36).slice(2), type, data: "" }]);
  
  const updateStepData = (id: string, data: string) => {
    const next = liveMacro ? [...liveMacro] : [...macroSteps];
    const idx = next.findIndex(s => s.id === id);
    if (idx !== -1) { next[idx].data = data; updateMacro(next); if (liveMacro) setLiveMacro(next); }
  };
  
  const removeStep = (id: string) => {
    const next = liveMacro ? [...liveMacro] : [...macroSteps];
    const idx = next.findIndex(s => s.id === id);
    if (idx !== -1) { next.splice(idx, 1); updateMacro(next); if (liveMacro) setLiveMacro(next); }
  };

  useEffect(() => {
    if (sliceRef.current.actionType !== "multi_action") return;

    const handleGlobalKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;

      const currentSteps = liveMacroRef.current || getLatestMacro();

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
  }, [selectedMacroId]);

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

  const availableTypes: ActionTypeValue[] = isChildItem
    ? ["shortcut", "launch", "script", "text_snippet", "media", "system", "switch_profile"]
    : ["shortcut", "launch", "script", "folder", "text_snippet", "media", "system", "switch_profile", "multi_action"];

  const hasChildren = slice.actionType === "folder" && (slice.children?.length ?? 0) > 0;
// 💥 เพิ่มตัวแปรนี้ไว้ก่อน return เพื่อใช้จัดการสีกรอบ Input ตอน Focus 💥
  const focusClass = activeTheme.isDark 
    ? "focus:border-white/40 focus:ring-1 focus:ring-white/20" 
    : "focus:border-black/40 focus:ring-1 focus:ring-black/10";

  return (
    <div className={`min-h-full flex flex-col pt-8 px-8 pb-32 space-y-7 transition-colors duration-500 bg-transparent`} onClick={() => setSelectedMacroId(null)}>
      
      {/* Ghost Element สำหรับลาก Macro */}
      {draggedMacroId && dragPos && (() => {
        const step = displayMacro.find(s => s.id === draggedMacroId);
        if (!step) return null;
        return (
          <div className={`fixed pointer-events-none z-[9999] flex items-center gap-3 border rounded-xl p-2.5 shadow-[0_0_40px_rgba(249,115,22,0.2)] scale-105 transition-transform origin-top-left ${activeTheme.panel} border-orange-500/80 backdrop-blur-xl`}
               style={{ left: dragPos.x - dragOffset.x, top: dragPos.y - dragOffset.y, width: dragWidth, margin: 0 }}>
            <div className="flex flex-col items-center justify-center w-8 shrink-0"><GripVertical size={20} className="text-orange-500 animate-pulse" /></div>
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[9px] font-bold text-orange-500 uppercase tracking-wider">{step.type.replace("_", " ")}</span>
              <div className={`w-full border rounded-lg px-3 py-1.5 text-xs font-mono ${activeTheme.isDark ? 'bg-black/40 border-orange-500/30 text-zinc-400' : 'bg-white/60 border-orange-300 text-zinc-600'}`}>{step.data || "..."}</div>
            </div>
          </div>
        );
      })()}

      <div className={`flex items-center justify-between border-b pb-4 ${activeTheme.isDark ? 'border-white/10' : 'border-black/10'}`}>
        {/* 💥 แก้สีคำว่า Configuration ให้เป็น Neutral กลืนไปกับธีม 💥 */}
        <h3 className="text-[11px] font-bold tracking-[0.2em] uppercase opacity-50 text-current">Configuration</h3>
        <button onClick={onDelete} className={`text-xs font-bold text-red-500 hover:text-red-400 bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20 transition-all active:scale-95 ${!activeTheme.isDark && 'shadow-sm'}`}>
          <Trash2 size={16} className="pointer-events-none" />
        </button>
      </div>

      <div className="flex flex-col gap-8">
        
        {/* Name & Icon */}
        <div className="flex gap-4 items-end">
          <div className="flex-1 space-y-2">
            <label className="block text-[10px] font-bold opacity-50 uppercase tracking-widest text-current">Display Label</label>
            <input 
              ref={labelRef} type="text" value={slice.label} onChange={(e) => set("label", e.target.value)} 
              placeholder="e.g. Open Browser" 
              // 💥 นำ focusClass มาใช้ 💥
              className={`w-full bg-transparent border ${activeTheme.border} rounded-xl px-4 py-2.5 text-sm text-current focus:outline-none transition-all placeholder-current placeholder-opacity-30 ${focusClass}`} 
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-bold opacity-50 uppercase tracking-widest text-center text-current">Icon</label>
            <button 
              onClick={() => setShowIconPicker(!showIconPicker)} 
              // 💥 เปลี่ยนสีปุ่ม Icon Picker ตอนทำงานให้เป็นโทน Neutral 💥
              className={`w-14 h-[42px] border rounded-xl flex items-center justify-center transition-all ${
                showIconPicker ? `border-current shadow-lg ${activeTheme.isDark ? 'bg-white/10' : 'bg-black/5'}` 
                               : `bg-transparent ${activeTheme.border} opacity-70 hover:opacity-100 hover:${activeTheme.isDark ? 'border-white/40' : 'border-black/40'}`
              }`}
            >
              <CurrentIcon size={20} strokeWidth={2.5} />
            </button>
            {showIconPicker && (
              // 💥 ใส่ backdrop-blur-2xl แก้ปัญหาทะลุ 💥
              <div className={`absolute top-[260px] right-8 z-[100] p-4 border rounded-2xl shadow-2xl w-[320px] animate-in zoom-in-95 duration-200 ${activeTheme.panel} ${activeTheme.border} backdrop-blur-2xl`}>
                <div className="grid grid-cols-6 gap-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                  {ICON_LIST.map((iconName) => {
                    const IconComp = ICON_MAP[iconName];
                    return (
                      <button 
                        key={iconName} 
                        onClick={() => { set("icon", iconName); setShowIconPicker(false); }} 
                        // 💥 เปลี่ยนสีไอคอนที่ถูกเลือกให้เป็น ขาว/ดำ ชัดเจน 💥
                        className={`p-2.5 flex items-center justify-center rounded-lg transition-all ${
                          slice.icon === iconName 
                            ? (activeTheme.isDark ? "bg-white text-black shadow-md" : "bg-black text-white shadow-md") 
                            : `opacity-60 hover:opacity-100 ${activeTheme.isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`
                        }`}
                      >
                        <IconComp size={18} />
                      </button>
                    );
                  })}
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
              {ACCENT_PALETTE.map((c) => <button key={c} onClick={() => set("color", c)} className={`w-5 h-5 rounded-md border-2 transition-all hover:scale-125 ${slice.color === c ? (activeTheme.isDark ? "border-white" : "border-black shadow-md") : "border-transparent"}`} style={{ backgroundColor: c }} />)}
            </div>
          </div>
        </div>

        {/* Action Type */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="block text-[10px] font-bold opacity-50 uppercase tracking-widest text-current">Action Type</label>
            {hasChildren && <span className="text-[10px] text-rose-500 font-medium animate-pulse">Items inside • Cannot change</span>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {availableTypes.map((t) => (
              <button 
                key={t} disabled={hasChildren && t !== "folder"} 
                onClick={() => onChange({ ...slice, actionType: t, actionData: t === "folder" ? "" : slice.actionData })} 
                className={`py-2.5 rounded-xl text-[10px] font-extrabold border transition-all ${
                  slice.actionType === t 
                    ? ACTION_TYPE_STYLES[activeTheme.isDark ? 'dark' : 'light'][t] + " border-current shadow-sm" 
                    : `bg-transparent ${activeTheme.border} opacity-50 hover:opacity-100 ${activeTheme.isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`
                } ${hasChildren && t !== "folder" ? "opacity-20 cursor-not-allowed" : "active:scale-95"}`}
              >
                {ACTION_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs & Macros */}
        {slice.actionType !== "folder" && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="block text-[10px] font-bold opacity-50 uppercase tracking-widest text-current">
              {slice.actionType === "text_snippet" ? "Text Content" : slice.actionType === "media" || slice.actionType === "system" ? "Select Action" : slice.actionType === "switch_profile" ? "Target Profile" : slice.actionType === "multi_action" ? "Macro Builder" : "Command Details"}
            </label>

            {slice.actionType === "text_snippet" && <textarea value={slice.actionData || ""} onChange={(e) => set("actionData", e.target.value)} placeholder="Type the text you want to auto-type..." className={`w-full h-32 bg-transparent border ${activeTheme.border} rounded-2xl p-4 text-sm text-current focus:outline-none resize-none transition-all custom-scrollbar placeholder-current placeholder-opacity-30 ${focusClass}`} />}
            
            {slice.actionType === "media" && <select value={slice.actionData || ""} onChange={(e) => set("actionData", e.target.value)} className={`w-full bg-transparent border ${activeTheme.border} rounded-xl p-3 text-sm text-current focus:outline-none cursor-pointer appearance-none ${focusClass}`}><option value="" disabled>Choose a media command...</option>{MEDIA_COMMANDS.map(cmd => <option key={cmd.value} value={cmd.value} className={activeTheme.isDark ? "bg-[#0c0c0e]" : "bg-white"}>{cmd.label}</option>)}</select>}
            
            {slice.actionType === "system" && <select value={slice.actionData || ""} onChange={(e) => set("actionData", e.target.value)} className={`w-full bg-transparent border ${activeTheme.border} rounded-xl p-3 text-sm text-current focus:outline-none cursor-pointer appearance-none ${focusClass}`}><option value="" disabled>Choose a system command...</option>{SYSTEM_COMMANDS.map(cmd => <option key={cmd.value} value={cmd.value} className={activeTheme.isDark ? "bg-[#0c0c0e]" : "bg-white"}>{cmd.label}</option>)}</select>}
            
            {slice.actionType === "switch_profile" && <select value={slice.actionData || ""} onChange={(e) => set("actionData", e.target.value)} className={`w-full bg-transparent border ${activeTheme.border} rounded-xl p-3 text-sm text-current focus:outline-none cursor-pointer appearance-none ${focusClass}`}><option value="" disabled>Switch to Profile...</option>{profiles.map(p => <option key={p.id} value={p.id} className={activeTheme.isDark ? "bg-[#0c0c0e]" : "bg-white"}>{p.name} {p.isDefault ? "• Default" : ""}</option>)}</select>}
            
            {["shortcut", "launch", "script"].includes(slice.actionType) && (
              <div className="flex gap-2">
                <input ref={actionInputRef} type="text" readOnly={isRecording} value={isRecording ? "Listening..." : slice.actionData || ""} onChange={(e) => set("actionData", e.target.value)} onKeyDown={handleKeyDown} placeholder={ACTION_DATA_PLACEHOLDERS[slice.actionType]} className={`flex-1 bg-transparent border rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none transition-all placeholder-current placeholder-opacity-30 ${isRecording ? "border-red-500/50 text-red-500 ring-2 ring-red-500/20 animate-pulse" : `${activeTheme.border} text-current ${focusClass}`}`} />
                {slice.actionType === "shortcut" ? (
                  <button onClick={() => setIsRecording(!isRecording)} className={`px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${isRecording ? "bg-red-500/20 text-red-500 border border-red-500/30" : `bg-transparent opacity-60 hover:opacity-100 border ${activeTheme.border} ${activeTheme.isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}`}>
                    {isRecording ? <X size={14} /> : <Circle size={12} className="fill-red-500 text-red-500" />} {isRecording ? "Cancel" : "Record"}
                  </button>
                ) : (
                  <button onClick={handleBrowse} className={`px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all bg-transparent opacity-60 hover:opacity-100 border ${activeTheme.border} ${activeTheme.isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}><FolderOpen size={14} /> Browse</button>
                )}
              </div>
            )}

            {/* Macro Builder */}
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
                   {displayMacro.map((step, idx) => (
                     <div 
                       key={step.id} 
                       data-step-id={step.id}
                       onClick={(e) => { e.stopPropagation(); setSelectedMacroId(step.id); }}
                       className={`flex items-center gap-3 border rounded-xl p-2.5 group transition-all duration-200 ease-out cursor-default
                         ${draggedMacroId === step.id ? "opacity-0 scale-95" : "opacity-100 scale-100"}
                         ${copiedFlashId === step.id 
                           ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                           : selectedMacroId === step.id 
                             ? "border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.15)] bg-indigo-500/5"
                             : `${activeTheme.panel} ${activeTheme.border} hover:border-current`}
                       `}
                     >
                       <div className="flex flex-col items-center justify-center w-8 shrink-0">
                         <span className={`text-[8px] font-black mb-1 px-1.5 py-0.5 rounded ${activeTheme.isDark ? 'bg-white/10 text-zinc-400' : 'bg-black/5 text-zinc-500'}`}>#{idx + 1}</span>
                         {step.type === "delay" ? <Clock size={14} className="text-blue-500" /> :
                          step.type === "shortcut" ? <Zap size={14} className="text-indigo-500" /> :
                          step.type === "text_snippet" ? <LayoutGrid size={14} className="text-emerald-500" /> :
                          <FolderOpen size={14} className="text-sky-500" />}
                       </div>
                       
                       <div className="flex-1 flex flex-col gap-1">
                          <span className="text-[9px] font-bold opacity-60 uppercase tracking-wider text-current">{step.type.replace("_", " ")}</span>
                          
                          {step.type === "delay" ? (
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" value={step.data} onChange={(e) => updateStepData(step.id, e.target.value)} 
                                placeholder="e.g. 500" 
                                className={`w-24 bg-transparent border rounded-lg px-3 py-1.5 text-xs text-current focus:outline-none transition-all font-mono placeholder-current placeholder-opacity-30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield] ${activeTheme.border} ${focusClass}`} 
                              />
                              <span className="text-xs opacity-50">ms</span>
                            </div>
                          ) : step.type === "shortcut" ? (
                            <input 
                              type="text" 
                              value={recordingMacroId === step.id ? "Listening... (Press keys)" : step.data} 
                              onClick={() => setRecordingMacroId(step.id)}
                              onBlur={() => setRecordingMacroId(null)}
                              onKeyDown={(e) => handleMacroShortcutRecord(e, step.id)}
                              readOnly
                              placeholder="Click to record shortcut..." 
                              className={`w-full bg-transparent border rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none transition-all placeholder-current placeholder-opacity-30 ${recordingMacroId === step.id ? "border-red-500/50 text-red-500 ring-1 ring-red-500/30 animate-pulse cursor-default" : `${activeTheme.border} text-current cursor-pointer ${focusClass}`}`} 
                            />
                          ) : (
                            <input type="text" value={step.data} onChange={(e) => updateStepData(step.id, e.target.value)} placeholder={`Enter ${step.type} data...`} className={`w-full bg-transparent border rounded-lg px-3 py-1.5 text-xs text-current focus:outline-none transition-all font-mono placeholder-current placeholder-opacity-30 ${activeTheme.border} ${focusClass}`} />
                          )}
                       </div>

                       <div className="flex items-center gap-1 shrink-0 opacity-20 group-hover:opacity-100 transition-opacity">
                         <button onClick={(e) => { e.stopPropagation(); removeStep(step.id); }} className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors"><Trash2 size={14} /></button>
                         <div 
                           className="p-1.5 opacity-60 hover:opacity-100 cursor-grab active:cursor-grabbing touch-none"
                           onPointerDown={(e) => handlePointerDown(e, step.id)}
                         >
                           <GripVertical size={16} />
                         </div>
                       </div>
                     </div>
                   ))}
                   
                   {displayMacro.length === 0 && (
                     <div 
                       className={`text-center py-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${activeTheme.isDark ? 'border-white/10 hover:border-white/30' : 'border-black/10 hover:border-black/30'}`}
                       onClick={(e) => { e.stopPropagation(); setSelectedMacroId(null); }}
                     >
                       <LayoutGrid size={24} className="mx-auto opacity-40 mb-2" />
                       <p className="opacity-60 text-xs font-medium">No actions in this macro yet.</p>
                       <p className="opacity-40 text-[10px] mt-1">Add your first action using the buttons below.</p>
                     </div>
                   )}
                 </div>

                 <div className={`pt-2 mt-4 border-t ${activeTheme.isDark ? 'border-white/10' : 'border-black/10'}`} onClick={(e) => e.stopPropagation()}>
                   <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest mt-4 mb-4 text-center text-current">Add New Step</p>
                   <div className="flex flex-wrap justify-center gap-2">
                     {["shortcut", "launch", "text_snippet", "delay"].map(type => (
                       <button key={type} onClick={() => addMacroStep(type)} className={`px-3 py-2 border rounded-xl text-[10px] font-bold transition-all capitalize flex items-center gap-1.5 ${activeTheme.isDark ? 'bg-white/5 border-white/10 hover:border-orange-500/50 hover:bg-orange-500/10 text-zinc-300 hover:text-orange-400' : 'bg-black/5 border-black/10 hover:border-orange-500/50 hover:bg-orange-500/10 text-zinc-600 hover:text-orange-600 shadow-sm'}`}>
                         <Plus size={10} strokeWidth={3} /> {type.replace("_", " ")}
                       </button>
                     ))}
                   </div>
                 </div>
               </div>
            )}
          </div>
        )}
      </div>
      <div className="h-40 shrink-0" />
    </div>
  );
}