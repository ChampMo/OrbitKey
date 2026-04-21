/**
 * ControlPanel.tsx — Action Ring Settings Dashboard (Split-Screen Version)
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core"; // Tauri v2
import { open } from "@tauri-apps/plugin-dialog"; // Tauri v2
import {
  Zap,
  Globe,
  Code2,
  Copy,
  ClipboardPaste,
  Camera,
  Settings,
  Wifi,
  Volume2,
  Play,
  Pause,
  Monitor,
  Terminal,
  Folder,
  Mail,
  MessageSquare,
  Cpu,
  HardDrive,
  LayoutGrid,
  MousePointer2,
  Search,
  Music,
  Power,
  Plus,
} from "lucide-react";

// ─── 1. Types & Interfaces (Updated for Folders) ──────────────────────────
type ActionTypeValue = "shortcut" | "launch" | "script" | "folder";

interface ApiSlice {
  id: string;
  label: string;
  icon?: string | null;
  color?: string | null;
  actionType: ActionTypeValue;
  actionData?: string | null;
  scriptArgs?: string[];
  children?: ApiSlice[] | null;
}

interface ApiProfile {
  id: string;
  name: string;
  appMatcher?: string | null;
  isDefault: boolean;
  slices: ApiSlice[];
}

interface SliceForm {
  id: string;
  label: string;
  icon: string;
  color: string;
  actionType: ActionTypeValue;
  actionData: string;
  scriptArgs: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

// ─── 2. Constants & Maps ──────────────────────────────────────────────────
const ACCENT_PALETTE = [
  "#4285f4",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#8b5cf6",
  "#ec4899",
  "#84cc16",
];

const ICON_MAP: Record<string, any> = {
  Zap,
  Globe,
  Code2,
  Copy,
  ClipboardPaste,
  Camera,
  Settings,
  Wifi,
  Volume2,
  Play,
  Pause,
  Monitor,
  Terminal,
  Folder,
  Mail,
  MessageSquare,
  Cpu,
  HardDrive,
  LayoutGrid,
  MousePointer2,
  Search,
  Music,
  Power,
};
const ICON_LIST = Object.keys(ICON_MAP);

const ACTION_TYPE_LABELS: Record<ActionTypeValue, string> = {
  shortcut: "Shortcut",
  launch: "Launch",
  script: "Script",
  folder: "Folder",
};

const ACTION_TYPE_COLORS: Record<ActionTypeValue, string> = {
  shortcut: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  launch: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  script: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  folder: "bg-rose-500/10 text-rose-400 border-rose-500/30",
};

const ACTION_DATA_PLACEHOLDERS: Record<ActionTypeValue, string> = {
  shortcut: "e.g. ctrl+c or alt+f4",
  launch: "e.g. https://google.com or code",
  script: "e.g. C:\\scripts\\run.bat",
  folder: "No command needed for folders",
};

// ─── 3. Helper Functions ──────────────────────────────────────────────────
function uid(): string {
  return Math.random().toString(36).slice(2, 11);
}

function emptyForm(): SliceForm {
  return {
    id: "new",
    label: "",
    icon: "Zap",
    color: ACCENT_PALETTE[Math.floor(Math.random() * ACCENT_PALETTE.length)],
    actionType: "shortcut",
    actionData: "",
    scriptArgs: "",
  };
}

function sliceToForm(s: ApiSlice): SliceForm {
  return {
    id: s.id,
    label: s.label,
    icon: s.icon ?? "Zap",
    color: s.color ?? "#6366f1",
    actionType: s.actionType,
    actionData: s.actionData ?? "",
    scriptArgs: (s.scriptArgs ?? []).join(", "),
  };
}

function formToSlice(f: SliceForm): ApiSlice {
  return {
    id: f.id === "new" ? uid() : f.id,
    label: f.label.trim() || "Untitled",
    icon: f.icon.trim() || "Zap",
    color: f.color,
    actionType: f.actionType,
    actionData: f.actionType === "folder" ? null : f.actionData.trim(),
    scriptArgs: f.scriptArgs
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    children: f.actionType === "folder" ? [] : null,
  };
}

// ─── 4. Slice Editor Component (Your Original Beautiful UI) ───────────────
function SliceEditor({
  form,
  isNew,
  onChange,
  onSave,
  onCancel,
  onDelete,
}: {
  form: SliceForm;
  isNew: boolean;
  onChange: (f: SliceForm) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const labelRef = useRef<HTMLInputElement>(null);
  const actionInputRef = useRef<HTMLInputElement>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    labelRef.current?.focus();
  }, [form.id]);

  useEffect(() => {
    if (isRecording) actionInputRef.current?.focus();
  }, [isRecording]);

  const set = useCallback(
    <K extends keyof SliceForm>(key: K, value: SliceForm[K]) =>
      onChange({ ...form, [key]: value }),
    [form, onChange],
  );

  const canSave =
    form.label.trim().length > 0 &&
    (form.actionType === "folder" || form.actionData.trim().length > 0);
  const CurrentIcon = ICON_MAP[form.icon] || ICON_MAP.Zap;

  const handleBrowse = async () => {
    try {
      const selectedPath = await open({ multiple: false, directory: false });
      if (selectedPath) set("actionData", selectedPath as string);
    } catch (err) {
      console.error("Browse error:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isRecording) {
      if (e.key === "Enter" && canSave) onSave();
      if (e.key === "Escape") onCancel();
      return;
    }
    e.preventDefault();
    if (e.key === "Escape") {
      setIsRecording(false);
      return;
    }
    const keys: string[] = [];
    if (e.ctrlKey) keys.push("ctrl");
    if (e.altKey) keys.push("alt");
    if (e.shiftKey) keys.push("shift");
    if (e.metaKey) keys.push("cmd");

    if (!["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
      let keyName = e.key.toLowerCase();
      if (keyName === " ") keyName = "space";
      keys.push(keyName);
      set("actionData", keys.join("+"));
      setIsRecording(false);
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-500/10 to-zinc-900/50 p-6 space-y-6 shadow-lg">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h3 className="text-sm font-semibold text-indigo-300 tracking-wide uppercase">
          {isNew ? "Create New Slice" : "Edit Configuration"}
        </h3>
        {!isNew && (
          <button
            onClick={onDelete}
            className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 transition-colors"
          >
            Delete Slice
          </button>
        )}
      </div>

      {/* Row 1: Label / Icon / Color */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-5 relative">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Label
          </label>
          <input
            ref={labelRef}
            type="text"
            value={form.label}
            onChange={(e) => set("label", e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Icon
          </label>
          <button
            type="button"
            onClick={() => setShowIconPicker(!showIconPicker)}
            className={`w-14 h-[42px] bg-zinc-950 border rounded-xl flex items-center justify-center transition-all ${showIconPicker ? "border-indigo-500 text-indigo-400" : "border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}
          >
            <CurrentIcon size={20} strokeWidth={2.5} />
          </button>
          {showIconPicker && (
            <div className="absolute top-[80px] right-[60px] z-50 p-3 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl w-[260px]">
              <div className="grid grid-cols-5 gap-1.5 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                {ICON_LIST.map((iconName) => {
                  const IconCmp = ICON_MAP[iconName];
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => {
                        set("icon", iconName);
                        setShowIconPicker(false);
                      }}
                      className={`p-2 flex items-center justify-center rounded-lg transition-colors ${form.icon === iconName ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/50" : "border border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white"}`}
                    >
                      <IconCmp size={18} strokeWidth={2.5} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Color
          </label>
          <div className="flex items-center gap-3">
            <div className="relative w-[42px] h-[42px] shrink-0">
              <input
                type="color"
                value={form.color}
                onChange={(e) => set("color", e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
              />
              <div
                className="w-full h-full rounded-full border-2 border-zinc-700 transition-transform hover:scale-105"
                style={{
                  backgroundColor: form.color,
                  boxShadow: `0 0 15px ${form.color}40`,
                }}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 max-w-[80px]">
              {ACCENT_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("color", c)}
                  className={`w-4 h-4 rounded-full border transition-all hover:scale-125 ${form.color === c ? "border-white" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Action Type
        </label>
        <div className="flex gap-2">
          {(
            ["shortcut", "launch", "script", "folder"] as ActionTypeValue[]
          ).map((t) => (
            <button
              key={t}
              onClick={() => {
                set("actionType", t);
                if (t === "folder") set("actionData", "");
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all duration-200 ${form.actionType === t ? ACTION_TYPE_COLORS[t] + " shadow-md" : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"}`}
            >
              {ACTION_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {form.actionType !== "folder" && (
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Command / Path
          </label>
          <div className="flex gap-2">
            <input
              ref={actionInputRef}
              type="text"
              value={
                isRecording ? "Listening... (Press your keys)" : form.actionData
              }
              readOnly={isRecording}
              onChange={(e) => set("actionData", e.target.value)}
              placeholder={ACTION_DATA_PLACEHOLDERS[form.actionType]}
              className={`w-full bg-zinc-950 border rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none transition-all ${isRecording ? "border-red-500/50 text-red-400 ring-1 ring-red-500/30 animate-pulse" : "border-zinc-800 text-white placeholder-zinc-700 focus:border-indigo-500"}`}
              onKeyDown={handleKeyDown}
            />
            {form.actionType === "shortcut" && (
              <button
                onClick={() => setIsRecording(!isRecording)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all shrink-0 ${isRecording ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"}`}
              >
                {isRecording ? "Cancel" : "⏺ Record"}
              </button>
            )}
            {(form.actionType === "launch" || form.actionType === "script") && (
              <button
                onClick={handleBrowse}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 rounded-xl text-xs font-medium transition-all shrink-0"
              >
                📂 Browse
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
        <button
          onClick={onCancel}
          className="px-5 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={!canSave}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-95"
        >
          Save Slice
        </button>
      </div>
    </div>
  );
}

// ─── 5. Main Control Panel Component ──────────────────────────────────────
export default function ControlPanel() {
  const [profiles, setProfiles] = useState<ApiProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeProfileIndex, setActiveProfileIndex] = useState(0);
  const [editingForm, setEditingForm] = useState<SliceForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const activeProfile = profiles[activeProfileIndex];
  const slices = activeProfile?.slices ?? [];

  // --- Fetch Initial Data ---
  useEffect(() => {
    invoke<ApiProfile[]>("get_profiles")
      .then((data) => {
        setProfiles(data);
        setLoading(false);
      })
      .catch((e) => {
        setLoadError(String(e));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (saveStatus !== "saved") return;
    const t = setTimeout(() => setSaveStatus("idle"), 2500);
    return () => clearTimeout(t);
  }, [saveStatus]);

  // --- State Handlers ---
  function updateSlices(next: ApiSlice[]) {
    setProfiles((prev) =>
      prev.map((p, i) =>
        i === activeProfileIndex ? { ...p, slices: next } : p,
      ),
    );
    setIsDirty(true);
  }

  function handleEditSlice(slice: ApiSlice) {
    setEditingForm(sliceToForm(slice));
    setEditingId(slice.id);
  }

  function handleNewSlice() {
    setEditingForm(emptyForm());
    setEditingId("new");
  }

  function handleEditorSave() {
    if (!editingForm) return;
    const updated = formToSlice(editingForm);
    if (editingId === "new") {
      updateSlices([...slices, updated]);
    } else {
      updateSlices(slices.map((s) => (s.id === editingId ? updated : s)));
    }
    setEditingForm(null);
    setEditingId(null);
  }

  function handleDeleteSlice() {
    if (!editingId || editingId === "new") return;
    if (!window.confirm("Are you sure you want to delete this slice?")) return;
    updateSlices(slices.filter((s) => s.id !== editingId));
    setEditingForm(null);
    setEditingId(null);
  }

  async function handleSaveAll() {
    if (profiles.length === 0) return;
    setSaveStatus("saving");
    try {
      await invoke("save_profiles", { profiles });
      setSaveStatus("saved");
      setIsDirty(false);
    } catch (e) {
      setSaveStatus("error");
    }
  }

  async function handleExport() {
    // Basic export logic placeholder (requires file dialog integration similar to save)
    console.log("Exporting...", activeProfile);
  }

  // --- Render ---
  if (loading)
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">
        Loading Configuration...
      </div>
    );
  if (loadError)
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center text-red-400">
        Error: {loadError}
      </div>
    );

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-zinc-100 overflow-hidden font-sans">
      {/* TOP HEADER */}
      <header className="shrink-0 flex items-center justify-between px-6 py-4 bg-[#0c0c0e] border-b border-zinc-800/60 z-10 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 pr-4 border-r border-zinc-800">
            <span className="text-2xl drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">
              🎯
            </span>
            <div>
              <h1 className="text-md font-bold tracking-tight text-white leading-tight">
                Action Ring
              </h1>
              <p className="text-[10px] text-zinc-500 tracking-widest uppercase">
                Dashboard
              </p>
            </div>
          </div>

          {/* Profile Tabs */}
          <div className="flex items-center gap-2">
            {profiles.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => {
                  setActiveProfileIndex(idx);
                  setEditingForm(null);
                }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeProfileIndex === idx ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent"}`}
              >
                {p.name}
              </button>
            ))}
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors">
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isDirty && saveStatus === "idle" && (
            <span className="text-xs text-amber-400 animate-pulse font-medium">
              ● Unsaved changes
            </span>
          )}
          {saveStatus === "saving" && (
            <span className="text-xs text-zinc-500">Saving…</span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs text-emerald-400 font-medium">
              ✓ Saved
            </span>
          )}

          <div className="h-6 w-px bg-zinc-800 mx-2"></div>

          <button
            onClick={handleExport}
            className="text-xs font-medium text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Import / Export
          </button>
          <button
            onClick={handleSaveAll}
            disabled={!isDirty || saveStatus === "saving"}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-95"
          >
            Save All
          </button>
        </div>
      </header>

      {/* MAIN SPLIT-SCREEN AREA */}
      <main className="flex-1 flex overflow-hidden">
        {/* LEFT: CANVAS (Ring Preview) */}
        <div className="flex-1 relative bg-[#09090b] flex items-center justify-center border-r border-zinc-800/50 overflow-hidden">
          {/* Subtle Grid Background */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          ></div>

          <div className="absolute top-6 left-6 text-zinc-600 text-xs font-mono uppercase tracking-widest flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-zinc-700 animate-pulse"></div>{" "}
            Canvas Preview
          </div>

          {/* Radial Math to render Slices */}
          <div className="relative w-[400px] h-[400px] flex items-center justify-center">
            {/* Center Anchor */}
            <div className="w-16 h-16 rounded-full bg-zinc-900 border-2 border-zinc-800 shadow-[0_0_30px_rgba(0,0,0,0.5)] z-0 flex items-center justify-center">
              <span className="text-zinc-600 opacity-50">🎯</span>
            </div>

            {slices.map((slice, i) => {
              const total = slices.length;
              // Calculate angle: start from top (-90 deg) and go clockwise
              const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
              const radius = 140; // Distance from center
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              const isSelected = editingId === slice.id;
              const SliceIcon = ICON_MAP[slice.icon || "Zap"] || Zap;

              return (
                <button
                  key={slice.id}
                  onClick={() => handleEditSlice(slice)}
                  className={`absolute w-[60px] h-[60px] rounded-full flex flex-col items-center justify-center gap-1 shadow-xl transition-all duration-300 hover:scale-110 z-10
                    ${isSelected ? "ring-4 ring-indigo-500/50 scale-110" : "ring-1 ring-white/10"}`}
                  style={{
                    backgroundColor: slice.color ? `${slice.color}25` : "#333", // slightly transparent
                    backdropFilter: "blur(8px)",
                    transform: `translate(${x}px, ${y}px)`,
                  }}
                >
                  <SliceIcon
                    size={24}
                    style={{ color: slice.color || "#fff" }}
                  />
                  {slice.actionType === "folder" && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-zinc-800 rounded-full border border-zinc-600 flex items-center justify-center text-[10px]">
                      +
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Floating Add Button in Canvas */}
          <button
            onClick={handleNewSlice}
            className="absolute bottom-8 right-8 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all hover:scale-105 active:scale-95"
            title="Add New Slice"
          >
            <Plus size={24} />
          </button>
        </div>

        {/* RIGHT: SLICE EDITOR PANEL */}
        <div className="w-[450px] shrink-0 bg-[#0c0c0e] overflow-y-auto">
          {editingForm ? (
            <SliceEditor
              form={editingForm}
              isNew={editingId === "new"}
              onChange={setEditingForm}
              onSave={handleEditorSave}
              onCancel={() => {
                setEditingForm(null);
                setEditingId(null);
              }}
              onDelete={handleDeleteSlice}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4 p-8 text-center opacity-60">
              <MousePointer2 size={48} strokeWidth={1} />
              <div>
                <p className="text-sm font-medium text-zinc-300">
                  No Slice Selected
                </p>
                <p className="text-xs mt-1">
                  Click a slice on the left canvas to edit its properties, or
                  click the + button to add a new one.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
