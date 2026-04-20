/**
 * ControlPanel.tsx — Action Ring Settings Dashboard
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog"; // <--- Import Dialog Plugin
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
} from "lucide-react";

type ActionTypeValue = "shortcut" | "launch" | "script";

interface ApiSlice {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  actionType: ActionTypeValue;
  actionData: string;
  scriptArgs?: string[];
}

interface ApiProfile {
  id: string;
  name: string;
  appMatcher?: string;
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
};
const ACTION_TYPE_COLORS: Record<ActionTypeValue, string> = {
  shortcut: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  launch: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  script: "bg-amber-500/10 text-amber-400 border-amber-500/30",
};

const ACTION_DATA_PLACEHOLDERS: Record<ActionTypeValue, string> = {
  shortcut: "e.g. ctrl+c or alt+f4",
  launch: "e.g. https://google.com or code",
  script: "e.g. C:\\scripts\\run.bat",
};

function uid(): string {
  return Math.random().toString(36).slice(2, 11);
}

function emptyForm(): SliceForm {
  return {
    id: uid(),
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
    actionData: s.actionData,
    scriptArgs: (s.scriptArgs ?? []).join(", "),
  };
}

function formToSlice(f: SliceForm): ApiSlice {
  return {
    id: f.id,
    label: f.label.trim() || "Untitled",
    icon: f.icon.trim() || "Zap",
    color: f.color,
    actionType: f.actionType,
    actionData: f.actionData.trim(),
    scriptArgs: f.scriptArgs
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

function SliceRow({
  slice,
  index,
  isEditing,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: any) {
  const RowIcon = ICON_MAP[slice.icon || "Zap"] || ICON_MAP.Zap;

  return (
    <div
      className={`group flex items-center gap-4 px-5 py-4 rounded-xl border transition-all duration-200 ${
        isEditing
          ? "border-indigo-500/50 bg-indigo-500/5 shadow-[0_0_15px_rgba(99,102,241,0.05)]"
          : "border-zinc-800/50 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-zinc-700/50"
      }`}
    >
      <span className="w-5 text-center text-xs text-zinc-600 font-mono">
        {index + 1}
      </span>
      <div
        className="w-8 h-8 rounded-full shrink-0 shadow-sm flex items-center justify-center text-lg"
        style={{
          backgroundColor: slice.color + "25",
          border: `1px solid ${slice.color}40`,
          color: slice.color,
        }}
      >
        <RowIcon size={16} strokeWidth={2.5} />
      </div>
      <span className="flex-1 text-sm font-medium text-zinc-200 truncate tracking-wide">
        {slice.label}
      </span>
      <span
        className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium border uppercase tracking-wider ${ACTION_TYPE_COLORS[slice.actionType]}`}
      >
        {ACTION_TYPE_LABELS[slice.actionType]}
      </span>
      <span className="hidden md:block w-40 text-xs text-zinc-500 truncate font-mono bg-zinc-950/50 px-2 py-1 rounded-md border border-zinc-800/50">
        {slice.actionData}
      </span>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onMoveUp(slice.id)}
          disabled={isFirst}
          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50 disabled:opacity-20 transition-colors"
        >
          ▲
        </button>
        <button
          onClick={() => onMoveDown(slice.id)}
          disabled={isLast}
          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50 disabled:opacity-20 transition-colors"
        >
          ▼
        </button>
      </div>
      <div className="flex gap-2 shrink-0 ml-2">
        <button
          onClick={() => onEdit(slice)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isEditing ? "bg-indigo-500/20 text-indigo-300" : "text-zinc-400 bg-zinc-800/50 hover:text-white hover:bg-zinc-700"}`}
        >
          {isEditing ? "Editing…" : "Edit"}
        </button>
        <button
          onClick={() => onDelete(slice.id)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 bg-zinc-800/50 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all border border-transparent"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function SliceEditor({
  form,
  isNew,
  onChange,
  onSave,
  onCancel,
}: {
  form: SliceForm;
  isNew: boolean;
  onChange: (f: SliceForm) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const labelRef = useRef<HTMLInputElement>(null);
  const actionInputRef = useRef<HTMLInputElement>(null); // <--- เพิ่ม Ref สำหรับช่อง Command
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    labelRef.current?.focus();
  }, []);

  // ─── หัวใจสำคัญ: เมื่อกด Record ให้โฟกัสช่อง Input ทันที ───
  useEffect(() => {
    if (isRecording) {
      actionInputRef.current?.focus();
    }
  }, [isRecording]);

  const set = useCallback(
    <K extends keyof SliceForm>(key: K, value: SliceForm[K]) =>
      onChange({ ...form, [key]: value }),
    [form, onChange],
  );
  const canSave =
    form.label.trim().length > 0 && form.actionData.trim().length > 0;

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
    <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-500/10 to-transparent p-6 space-y-6 mt-4 shadow-lg">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h3 className="text-sm font-semibold text-indigo-300 tracking-wide">
          {isNew ? "Create New Slice" : "Edit Configuration"}
        </h3>
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
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Icon
          </label>
          <button
            type="button"
            onClick={() => setShowIconPicker(!showIconPicker)}
            className={`w-16 h-[42px] bg-zinc-900 border rounded-xl flex items-center justify-center transition-all ${showIconPicker ? "border-indigo-500 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]" : "border-zinc-700 text-zinc-300 hover:border-zinc-500"}`}
          >
            <CurrentIcon size={20} strokeWidth={2.5} />
          </button>
          {showIconPicker && (
            <div className="absolute top-[80px] right-[60px] z-50 p-3 bg-zinc-950 border border-zinc-700 rounded-xl shadow-2xl w-[280px]">
              <div className="grid grid-cols-5 gap-1.5 max-h-[180px] overflow-y-auto pr-1">
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
            <div className="relative w-11 h-11 shrink-0">
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
        <div className="flex gap-3">
          {(["shortcut", "launch", "script"] as ActionTypeValue[]).map((t) => (
            <button
              key={t}
              onClick={() => set("actionType", t)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all duration-200 ${form.actionType === t ? ACTION_TYPE_COLORS[t] + " shadow-md transform scale-[1.02]" : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800"}`}
            >
              {ACTION_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Command / Path
        </label>
        <div className="flex gap-2">
          <input
            ref={actionInputRef} // <--- ใส่ Ref ตรงนี้
            type="text"
            value={
              isRecording ? "Listening... (Press your keys)" : form.actionData
            }
            readOnly={isRecording}
            onChange={(e) => set("actionData", e.target.value)}
            placeholder={ACTION_DATA_PLACEHOLDERS[form.actionType]}
            className={`w-full bg-zinc-900 border rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none transition-all ${isRecording ? "border-red-500/50 text-red-400 ring-1 ring-red-500/30 animate-pulse" : "border-zinc-700 text-white placeholder-zinc-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50"}`}
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

export default function ControlPanel() {
  const [profiles, setProfiles] = useState<ApiProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<SliceForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const activeProfile = profiles[0];
  const slices = activeProfile?.slices ?? [];

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

  function updateSlices(next: ApiSlice[]) {
    setProfiles((prev) =>
      prev.map((p, i) => (i === 0 ? { ...p, slices: next } : p)),
    );
    setIsDirty(true);
  }
  function handleDeleteSlice(id: string) {
    if (!window.confirm("Delete this slice?")) return;
    updateSlices(slices.filter((s) => s.id !== id));
    if (editingId === id) {
      setEditingForm(null);
      setEditingId(null);
    }
  }
  function handleMoveUp(id: string) {
    const idx = slices.findIndex((s) => s.id === id);
    if (idx <= 0) return;
    const next = [...slices];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    updateSlices(next);
  }
  function handleMoveDown(id: string) {
    const idx = slices.findIndex((s) => s.id === id);
    if (idx < 0 || idx >= slices.length - 1) return;
    const next = [...slices];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    updateSlices(next);
  }
  function handleEditSlice(slice: ApiSlice) {
    setEditingForm(sliceToForm(slice));
    setEditingId(slice.id);
  }
  function handleNewSlice() {
    setEditingForm(emptyForm());
    setEditingId(null);
  }
  function handleEditorCancel() {
    setEditingForm(null);
    setEditingId(null);
  }
  function handleEditorSave() {
    if (!editingForm) return;
    const updated = formToSlice(editingForm);
    if (editingId === null) updateSlices([...slices, updated]);
    else updateSlices(slices.map((s) => (s.id === editingId ? updated : s)));
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

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-zinc-100 select-none overflow-hidden font-sans">
      <header className="shrink-0 flex items-center gap-4 px-8 py-5 bg-[#09090b] border-b border-zinc-800/50 z-10">
        <span className="text-2xl" aria-hidden>
          🎯
        </span>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold tracking-tight">Action Ring</h1>
          <p className="text-xs text-zinc-500 mt-0.5 tracking-wide">
            CONFIGURATION DASHBOARD
          </p>
        </div>
        <div className="flex items-center gap-4">
          {isDirty && saveStatus === "idle" && (
            <span className="text-xs text-amber-400 font-medium animate-pulse">
              ● Unsaved changes
            </span>
          )}
          {saveStatus === "saving" && (
            <span className="text-xs text-zinc-500">Saving…</span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs text-emerald-400 font-medium">
              ✓ All saved
            </span>
          )}
          <button
            onClick={handleSaveAll}
            disabled={
              !isDirty || saveStatus === "saving" || profiles.length === 0
            }
            className="px-5 py-2 bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-sm font-semibold rounded-xl transition-all active:scale-95 shadow-sm"
          >
            Save Changes
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto relative">
        <div className="max-w-4xl mx-auto px-8 py-8 space-y-8 pb-32">
          {!loading && !loadError && (
            <>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-100">
                    Action Slices
                  </h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    Configure the shortcuts that appear in your ring.
                  </p>
                </div>
                <button
                  onClick={handleNewSlice}
                  disabled={!!editingForm}
                  className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800/80 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 text-sm font-medium rounded-xl border border-zinc-700/50 transition-all hover:shadow-lg"
                >
                  <span className="text-lg leading-none">+</span> Add New Slice
                </button>
              </div>

              <div className="space-y-2.5">
                {slices.map((slice, index) => (
                  <SliceRow
                    key={slice.id}
                    slice={slice}
                    index={index}
                    isEditing={editingId === slice.id}
                    onEdit={handleEditSlice}
                    onDelete={handleDeleteSlice}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    isFirst={index === 0}
                    isLast={index === slices.length - 1}
                  />
                ))}
              </div>

              {editingForm && (
                <SliceEditor
                  form={editingForm}
                  isNew={editingId === null}
                  onChange={setEditingForm}
                  onSave={handleEditorSave}
                  onCancel={handleEditorCancel}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
