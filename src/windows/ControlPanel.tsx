/**
 * ControlPanel.tsx — Action Ring Settings Dashboard (Ultimate Arc Version)
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
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
  X,
  Upload,
  Trash2,
  ChevronRight,
} from "lucide-react";

// ─── 1. Types & Interfaces ────────────────────────────────────────────────
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
  folder: "Items inside this folder appear in the outer ring.",
};

// ─── 3. Helper Functions ──────────────────────────────────────────────────
function uid(): string {
  return Math.random().toString(36).slice(2, 11);
}

function emptySlice(): ApiSlice {
  return {
    id: uid(),
    label: "New Slice",
    icon: "Zap",
    color: ACCENT_PALETTE[Math.floor(Math.random() * ACCENT_PALETTE.length)],
    actionType: "shortcut",
    actionData: "",
    scriptArgs: [],
    children: [],
  };
}

// ─── 4. Real-time Slice Editor Component ──────────────────────────────────
function SliceEditor({
  slice,
  onChange,
  onDelete,
  onCancel,
}: {
  slice: ApiSlice;
  onChange: (updated: ApiSlice) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const labelRef = useRef<HTMLInputElement>(null);
  const actionInputRef = useRef<HTMLInputElement>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (isRecording) actionInputRef.current?.focus();
  }, [isRecording]);

  const set = useCallback(
    <K extends keyof ApiSlice>(key: K, value: ApiSlice[K]) =>
      onChange({ ...slice, [key]: value }),
    [slice, onChange],
  );

  const CurrentIcon = ICON_MAP[slice.icon || "Zap"] || ICON_MAP.Zap;

  const handleBrowse = async () => {
    try {
      const selectedPath = await open({ multiple: false, directory: false });
      if (selectedPath) set("actionData", selectedPath as string);
    } catch (err) {
      console.error("Browse error:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isRecording) return;

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
    <div className="h-full flex flex-col bg-[#0c0c0e] p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h3 className="text-sm font-bold text-indigo-300 tracking-wider uppercase">
          Edit Configuration
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800/50 px-4 py-2 rounded-lg border border-zinc-700/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
            className="text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_auto] gap-5 relative">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Label
          </label>
          <input
            ref={labelRef}
            type="text"
            value={slice.label}
            onChange={(e) => set("label", e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">
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
                {ICON_LIST.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => {
                      set("icon", iconName);
                      setShowIconPicker(false);
                    }}
                    className={`p-2 flex items-center justify-center rounded-lg transition-colors ${slice.icon === iconName ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/50" : "border border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white"}`}
                  >
                    {React.createElement(ICON_MAP[iconName], {
                      size: 18,
                      strokeWidth: 2.5,
                    })}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Color
          </label>
          <div className="flex items-center gap-3">
            <div className="relative w-[42px] h-[42px] shrink-0">
              <input
                type="color"
                value={slice.color || "#6366f1"}
                onChange={(e) => set("color", e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
              />
              <div
                className="w-full h-full rounded-full border-2 border-zinc-700 transition-transform hover:scale-105"
                style={{
                  backgroundColor: slice.color || "#6366f1",
                  boxShadow: `0 0 15px ${slice.color || "#6366f1"}40`,
                }}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 max-w-[80px]">
              {ACCENT_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("color", c)}
                  className={`w-4 h-4 rounded-full border transition-all hover:scale-125 ${slice.color === c ? "border-white" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Action Type
        </label>
        <div className="flex gap-2">
          {(
            ["shortcut", "launch", "script", "folder"] as ActionTypeValue[]
          ).map((t) => (
            <button
              key={t}
              onClick={() => {
                onChange({
                  ...slice,
                  actionType: t,
                  actionData: t === "folder" ? "" : slice.actionData,
                  children: t === "folder" ? slice.children || [] : null,
                });
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all duration-200 ${slice.actionType === t ? ACTION_TYPE_COLORS[t] + " shadow-md" : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"}`}
            >
              {ACTION_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {slice.actionType !== "folder" && (
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Command / Path
          </label>
          <div className="flex gap-2">
            <input
              ref={actionInputRef}
              type="text"
              value={
                isRecording
                  ? "Listening... (Press your keys)"
                  : slice.actionData || ""
              }
              readOnly={isRecording}
              onChange={(e) => set("actionData", e.target.value)}
              placeholder={ACTION_DATA_PLACEHOLDERS[slice.actionType]}
              className={`w-full bg-zinc-950 border rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none transition-all ${isRecording ? "border-red-500/50 text-red-400 ring-1 ring-red-500/30 animate-pulse" : "border-zinc-800 text-white placeholder-zinc-700 focus:border-indigo-500"}`}
              onKeyDown={handleKeyDown}
            />
            {slice.actionType === "shortcut" && (
              <button
                onClick={() => setIsRecording(!isRecording)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all shrink-0 ${isRecording ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"}`}
              >
                {isRecording ? "Cancel" : "⏺ Record"}
              </button>
            )}
            {(slice.actionType === "launch" ||
              slice.actionType === "script") && (
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

      <div className="flex-1"></div>
    </div>
  );
}

// ─── 5. Main Control Panel Component ──────────────────────────────────────
export default function ControlPanel() {
  const [profiles, setProfiles] = useState<ApiProfile[]>([]);
  const [savedProfiles, setSavedProfiles] = useState<ApiProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeProfileIndex, setActiveProfileIndex] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const [originalSnapshot, setOriginalSnapshot] = useState<ApiSlice | null>(
    null,
  );
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const [isDirty, setIsDirty] = useState(false);
  const [dirtySliceIds, setDirtySliceIds] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // --- Real-time Fast Swap (Live Order) States ---
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const lastHoveredId = useRef<string | null>(null); // ป้องกันการรีเรนเดอร์รัวๆ
  const [liveOrder, setLiveOrder] = useState<string[] | null>(null); // เก็บ Order ชั่วคราวตอนกำลังลาก เพื่อให้แสดงอนิเมชั่นสลับที่ลื่นๆ

  const activeProfile = profiles[activeProfileIndex];
  const rootSlices = activeProfile?.slices ?? [];

  let editingSlice = rootSlices.find((s) => s.id === editingId);
  if (!editingSlice && activeFolderId) {
    const folder = rootSlices.find((s) => s.id === activeFolderId);
    editingSlice = folder?.children?.find((s) => s.id === editingId);
  }

  // --- Fetch Initial Data ---
  useEffect(() => {
    invoke<ApiProfile[]>("get_profiles")
      .then((data) => {
        setProfiles(data);
        setSavedProfiles(JSON.parse(JSON.stringify(data)));
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
  function handleAddProfile() {
    const initialSlice = emptySlice();
    const newProfile: ApiProfile = {
      id: uid(),
      name: `New Profile`,
      appMatcher: null,
      isDefault: false,
      slices: [initialSlice],
    };
    setProfiles([...profiles, newProfile]);
    setActiveProfileIndex(profiles.length);
    setIsDirty(true);
  }

  function handleProfileTabChange(idx: number) {
    if (isDirty) {
      setProfiles(JSON.parse(JSON.stringify(savedProfiles)));
      setIsDirty(false);
      setDirtySliceIds(new Set());
    }
    setActiveProfileIndex(idx);
    setActiveFolderId(null);
    setEditingId(null);
    setOriginalSnapshot(null);
    setIsCreatingNew(false);
  }

  function handleProfileNameChange(newName: string) {
    setProfiles((prev) =>
      prev.map((p, i) =>
        i === activeProfileIndex ? { ...p, name: newName } : p,
      ),
    );
    setIsDirty(true);
  }

  function handleStartEdit(slice: ApiSlice) {
    setOriginalSnapshot(JSON.parse(JSON.stringify(slice)));
    setIsCreatingNew(false);
    setEditingId(slice.id);

    // เปิด/ปิด Folder
    if (slice.actionType === "folder") {
      setActiveFolderId(slice.id);
    } else {
      const isChild = rootSlices
        .find((s) => s.id === activeFolderId)
        ?.children?.some((c) => c.id === slice.id);
      if (!isChild) setActiveFolderId(null);
    }
  }

  function handleUpdateSlice(updated: ApiSlice) {
    setProfiles((prev) =>
      prev.map((p, i) => {
        if (i !== activeProfileIndex) return p;
        let newSlices = [...p.slices];

        const rootIdx = newSlices.findIndex((s) => s.id === updated.id);
        if (rootIdx !== -1) {
          newSlices[rootIdx] = updated;
        } else if (activeFolderId) {
          const folderIdx = newSlices.findIndex((s) => s.id === activeFolderId);
          if (folderIdx !== -1 && newSlices[folderIdx].children) {
            const newChildren = [...newSlices[folderIdx].children!];
            const childIdx = newChildren.findIndex((c) => c.id === updated.id);
            if (childIdx !== -1) {
              newChildren[childIdx] = updated;
              newSlices[folderIdx] = {
                ...newSlices[folderIdx],
                children: newChildren,
              };
            }
          }
        }
        return { ...p, slices: newSlices };
      }),
    );
    setDirtySliceIds((prev) => new Set(prev).add(updated.id));
    setIsDirty(true);
  }

  function handleNewSlice() {
    const newSlice = emptySlice();
    setProfiles((prev) =>
      prev.map((p, i) => {
        if (i !== activeProfileIndex) return p;
        let newSlices = [...p.slices];
        if (activeFolderId) {
          const folderIdx = newSlices.findIndex((s) => s.id === activeFolderId);
          if (folderIdx !== -1) {
            newSlices[folderIdx] = {
              ...newSlices[folderIdx],
              children: [...(newSlices[folderIdx].children || []), newSlice],
            };
          }
        } else {
          newSlices.push(newSlice);
        }
        return { ...p, slices: newSlices };
      }),
    );
    setOriginalSnapshot(null);
    setIsCreatingNew(true);
    setEditingId(newSlice.id);
    setDirtySliceIds((prev) => new Set(prev).add(newSlice.id));
    setIsDirty(true);
  }

  function handleCancelEdit() {
    if (isCreatingNew && editingId) {
      setProfiles((prev) =>
        prev.map((p, i) => {
          if (i !== activeProfileIndex) return p;
          let newSlices = [...p.slices];
          if (activeFolderId) {
            newSlices = newSlices.map((s) =>
              s.id === activeFolderId
                ? {
                    ...s,
                    children: (s.children || []).filter(
                      (c) => c.id !== editingId,
                    ),
                  }
                : s,
            );
          } else {
            newSlices = newSlices.filter((s) => s.id !== editingId);
          }
          return { ...p, slices: newSlices };
        }),
      );
    } else if (originalSnapshot) {
      handleUpdateSlice(originalSnapshot);
    }

    if (editingId) {
      setDirtySliceIds((prev) => {
        const next = new Set(prev);
        next.delete(editingId!);
        return next;
      });
    }

    setEditingId(null);
    setIsCreatingNew(false);
    setOriginalSnapshot(null);
  }

  function handleDeleteSlice() {
    if (!editingId) return;
    setConfirmModal({
      title: "Delete Slice",
      message:
        "Are you sure you want to delete this slice? This action cannot be undone.",
      onConfirm: () => {
        setProfiles((prev) =>
          prev.map((p, i) => {
            if (i !== activeProfileIndex) return p;
            let newSlices = [...p.slices];
            if (activeFolderId) {
              newSlices = newSlices.map((s) =>
                s.id === activeFolderId
                  ? {
                      ...s,
                      children: (s.children || []).filter(
                        (c) => c.id !== editingId,
                      ),
                    }
                  : s,
              );
            } else {
              newSlices = newSlices.filter((s) => s.id !== editingId);
            }
            return { ...p, slices: newSlices };
          }),
        );
        setEditingId(null);
        setIsCreatingNew(false);
        setIsDirty(true);
      },
    });
  }

  function handleDeleteProfile() {
    if (profiles.length <= 1) {
      alert("Cannot delete the last profile.");
      return;
    }
    setConfirmModal({
      title: "Delete Profile",
      message: `Are you sure you want to delete "${activeProfile?.name}"? All slices inside it will be lost forever.`,
      onConfirm: () => {
        setProfiles((prev) => prev.filter((_, i) => i !== activeProfileIndex));
        setActiveProfileIndex(Math.max(0, activeProfileIndex - 1));
        setActiveFolderId(null);
        setEditingId(null);
        setIsDirty(true);
      },
    });
  }

  // --- Fast Pointer Drag & Drop Logic (No Lag) ---
  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartPos.current) return;
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;

    // เริ่มลาก (ขยับเกิน 5px)
    if (!draggedId && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      const id = e.currentTarget.getAttribute("data-slice-id");
      if (id) {
        setDraggedId(id);
        // เซ็ต Live Order พื้นฐานไว้เตรียมสลับที่
        const sourceSlices =
          activeFolderId &&
          rootSlices
            .find((s) => s.id === activeFolderId)
            ?.children?.some((c) => c.id === id)
            ? rootSlices.find((s) => s.id === activeFolderId)?.children || []
            : rootSlices;
        setLiveOrder(sourceSlices.map((s) => s.id));
      }
    }

    // กำลังลาก
    if (draggedId) {
      setDragPos({ x: e.clientX, y: e.clientY });

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const targetBtn = el?.closest("[data-slice-id]");

      if (targetBtn) {
        const targetId = targetBtn.getAttribute("data-slice-id");
        // Throttle: อัปเดตเฉพาะตอนเป้าหมายเปลี่ยน เพื่อลดอาการค้าง
        if (
          targetId &&
          targetId !== draggedId &&
          targetId !== lastHoveredId.current
        ) {
          lastHoveredId.current = targetId;

          let targetSlice = rootSlices.find((s) => s.id === targetId);
          let draggedSlice = rootSlices.find((s) => s.id === draggedId);
          let isSameLevel = true;

          if (!targetSlice || !draggedSlice) {
            const activeFolder = rootSlices.find(
              (s) => s.id === activeFolderId,
            );
            targetSlice =
              targetSlice ||
              activeFolder?.children?.find((s) => s.id === targetId);
            draggedSlice =
              draggedSlice ||
              activeFolder?.children?.find((s) => s.id === draggedId);
            isSameLevel = !!(
              activeFolder?.children?.find((s) => s.id === targetId) &&
              activeFolder?.children?.find((s) => s.id === draggedId)
            );
          }

          if (targetSlice && draggedSlice && isSameLevel) {
            if (
              targetSlice.actionType === "folder" &&
              draggedSlice.actionType !== "folder"
            ) {
              // เล็งเข้าโฟลเดอร์ ให้เรืองแสงเฉยๆ
              setHoveredId(targetId);
            } else {
              // **Real-time Swap!** สลับ Array ชั่วคราวใน Live Order เพื่ออนิเมชั่นลื่นๆ
              setLiveOrder((prev) => {
                if (!prev) return prev;
                const newOrder = [...prev];
                const fromIdx = newOrder.indexOf(draggedId);
                const toIdx = newOrder.indexOf(targetId);
                if (fromIdx !== -1 && toIdx !== -1) {
                  newOrder.splice(fromIdx, 1);
                  newOrder.splice(toIdx, 0, draggedId);
                }
                return newOrder;
              });
              setHoveredId(null);
            }
          } else if (!isSameLevel) {
            setHoveredId(targetId); // ข้ามระดับวงแหวน ให้เรืองแสงอย่างเดียว
          }
        }
      } else {
        lastHoveredId.current = null;
        setHoveredId(null);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent, slice: ApiSlice) => {
    if (!dragStartPos.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (!draggedId) {
      handleStartEdit(slice); // คลิกธรรมดา
    } else {
      // จบการลาก
      if (
        hoveredId &&
        rootSlices.find((s) => s.id === hoveredId)?.actionType === "folder"
      ) {
        // Drop เข้าไปใน Folder
        setProfiles((prevProfiles) =>
          prevProfiles.map((profile, idx) => {
            if (idx !== activeProfileIndex) return profile;
            let newSlices = [...profile.slices];
            const dIdx = newSlices.findIndex((s) => s.id === draggedId);
            const tIdx = newSlices.findIndex((s) => s.id === hoveredId);
            if (dIdx !== -1 && tIdx !== -1) {
              const draggedItem = newSlices[dIdx];
              const targetItem = newSlices[tIdx];
              newSlices.splice(dIdx, 1);
              const finalTIdx = newSlices.findIndex((s) => s.id === hoveredId);
              newSlices[finalTIdx] = {
                ...targetItem,
                children: [...(targetItem.children || []), draggedItem],
              };
            }
            return { ...profile, slices: newSlices };
          }),
        );
        setIsDirty(true);
        setDirtySliceIds((prev) => new Set(prev).add(draggedId).add(hoveredId));
      } else if (liveOrder) {
        // วางปุ่ม สลับตำแหน่งจริงใน State
        setProfiles((prevProfiles) =>
          prevProfiles.map((profile, idx) => {
            if (idx !== activeProfileIndex) return profile;
            let newSlices = [...profile.slices];

            // เช็คว่าลากอยู่ในโฟลเดอร์ หรือวงหลัก
            const isDraggingInFolder =
              activeFolderId &&
              rootSlices
                .find((s) => s.id === activeFolderId)
                ?.children?.some((c) => c.id === draggedId);

            if (isDraggingInFolder) {
              const fIdx = newSlices.findIndex((s) => s.id === activeFolderId);
              if (fIdx !== -1 && newSlices[fIdx].children) {
                const newChildren = liveOrder
                  .map((id) =>
                    newSlices[fIdx].children!.find((c) => c.id === id),
                  )
                  .filter(Boolean) as ApiSlice[];
                newSlices[fIdx] = { ...newSlices[fIdx], children: newChildren };
              }
            } else {
              newSlices = liveOrder
                .map((id) => newSlices.find((s) => s.id === id))
                .filter(Boolean) as ApiSlice[];
            }
            return { ...profile, slices: newSlices };
          }),
        );
        setIsDirty(true);
      }
    }

    dragStartPos.current = null;
    lastHoveredId.current = null;
    setDraggedId(null);
    setDragPos(null);
    setHoveredId(null);
    setLiveOrder(null);
  };

  async function handleSaveAll() {
    if (profiles.length === 0) return;
    setSaveStatus("saving");
    try {
      await invoke("save_profiles", { profiles });
      setSavedProfiles(JSON.parse(JSON.stringify(profiles)));
      setSaveStatus("saved");
      setIsDirty(false);
      setDirtySliceIds(new Set());
    } catch (e) {
      setSaveStatus("error");
    }
  }

  async function handleExport() {
    if (!activeProfile) return;
    try {
      await invoke("export_profile", { profile: activeProfile });
    } catch (e) {
      console.error(e);
    }
  }

  async function handleImport() {
    try {
      const importedProfile = await invoke<ApiProfile>("import_profile");
      const updatedProfiles = [...profiles, importedProfile];
      setProfiles(updatedProfiles);
      setSavedProfiles(JSON.parse(JSON.stringify(updatedProfiles)));
      setActiveProfileIndex(updatedProfiles.length - 1);
      setIsDirty(false);
    } catch (e) {
      console.error(e);
    }
  }

  // --- Render Helpers ---
  const renderRing = (
    slicesToRender: ApiSlice[],
    radius: number,
    isOuter: boolean,
  ) => {
    // ถ้าวงนี้กำลังโดนลาก ให้ใช้ลำดับจาก Live Order เพื่อความสมูท
    const isDraggingInThisRing =
      draggedId && liveOrder && isOuter === !!activeFolderId;
    const orderArray = isDraggingInThisRing
      ? liveOrder
      : slicesToRender.map((s) => s.id);

    // หามุมของ Folder แม่ เพื่อวางวงแหวนลูก
    let parentAngle = 0;
    if (isOuter && activeFolderId) {
      const rootOrder =
        draggedId && liveOrder && !isOuter
          ? liveOrder
          : rootSlices.map((s) => s.id);
      const folderIdx = rootOrder.indexOf(activeFolderId);
      if (folderIdx !== -1) {
        parentAngle =
          (folderIdx / rootOrder.length) * 2 * Math.PI - Math.PI / 2;
      }
    }

    return slicesToRender.map((slice) => {
      const i = orderArray.indexOf(slice.id);
      if (i === -1) return null;

      const total = orderArray.length;
      let angle = 0;

      if (!isOuter) {
        angle = (i / total) * 2 * Math.PI - Math.PI / 2;
      } else {
        // Arc Spacing: จัดเรียงวงย่อยให้แผ่ออกเป็นทรงพัด รอบๆ โฟลเดอร์แม่
        const step = Math.PI / 5; // กางออกชิ้นละ 36 องศา
        const arcSpan = (total - 1) * step;
        angle = parentAngle - arcSpan / 2 + i * step;
      }

      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      const isSelected = editingId === slice.id;
      const isDirtySlice = dirtySliceIds.has(slice.id);
      const isBeingDragged = draggedId === slice.id;
      const isBeingHovered = hoveredId === slice.id;
      const isActiveFolder = activeFolderId === slice.id;
      const SliceIcon = ICON_MAP[slice.icon || "Zap"] || Zap;

      return (
        <button
          key={slice.id}
          data-slice-id={slice.id}
          onPointerDown={(e) => handlePointerDown(e, slice.id)}
          onPointerMove={handlePointerMove}
          onPointerUp={(e) => handlePointerUp(e, slice)}
          className={`absolute w-[64px] h-[64px] rounded-full flex flex-col items-center justify-center gap-1 shadow-xl transition-all duration-300 z-10 touch-none
            ${isBeingDragged ? "opacity-30 scale-90 ring-2 ring-indigo-500" : ""}
            ${isSelected && !isBeingDragged ? "ring-4 ring-indigo-500/50 scale-110" : !isBeingDragged && "hover:scale-110"}
            ${isBeingHovered && slice.actionType === "folder" ? "ring-4 ring-rose-500 scale-125" : ""}
            ${isDirtySlice && !isSelected && !isBeingHovered && !isBeingDragged ? "ring-2 ring-amber-400 border-transparent" : ""}
            ${!isSelected && !isDirtySlice && !isBeingHovered && !isBeingDragged ? "border border-white/10 hover:border-white/30" : ""}
            ${isOuter ? "scale-90 opacity-95" : ""}
          `}
          style={{
            backgroundColor: slice.color ? `${slice.color}50` : "#333",
            backdropFilter: "blur(8px)",
            transform: `translate(${x}px, ${y}px)`,
            cursor: isBeingDragged ? "grabbing" : "grab",
            zIndex: isBeingDragged ? 0 : isSelected ? 30 : 10,
          }}
        >
          <SliceIcon
            size={isOuter ? 22 : 26}
            style={{ color: slice.color || "#fff" }}
          />

          {/* Arrow Indicator สำหรับบอกว่าเป็น Folder */}
          {slice.actionType === "folder" && !isOuter && (
            <div
              className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center transition-all ${isActiveFolder ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)] text-white scale-110" : "bg-zinc-800 border border-zinc-600 text-zinc-400"}`}
            >
              {/* หมุนหัวลูกศรออกด้านนอกตามรัศมีเสมอ */}
              <ChevronRight
                size={14}
                style={{ transform: `rotate(${angle * (180 / Math.PI)}deg)` }}
              />
            </div>
          )}
        </button>
      );
    });
  };

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
    <div
      className="absolute inset-0 w-screen w-full h-screen m-0 p-0 flex flex-col bg-[#09090b] text-zinc-100 overflow-hidden font-sans"
      onClick={() => {
        setActiveFolderId(null);
        setEditingId(null);
      }}
    >
      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-2">
              {confirmModal.title}
            </h3>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GHOST ELEMENT FOR DRAGGING */}
      {draggedId &&
        dragPos &&
        (() => {
          let draggedSlice = rootSlices.find((s) => s.id === draggedId);
          if (!draggedSlice && activeFolderId)
            draggedSlice = rootSlices
              .find((s) => s.id === activeFolderId)
              ?.children?.find((s) => s.id === draggedId);

          if (!draggedSlice) return null;
          const SliceIcon = ICON_MAP[draggedSlice.icon || "Zap"] || Zap;
          return (
            <div
              className="fixed pointer-events-none z-[100] w-[64px] h-[64px] rounded-full flex flex-col items-center justify-center shadow-2xl scale-110 ring-4 ring-indigo-500/80"
              style={{
                left: dragPos.x,
                top: dragPos.y,
                transform: "translate(-50%, -50%)",
                backgroundColor: draggedSlice.color
                  ? `${draggedSlice.color}90`
                  : "#333",
                backdropFilter: "blur(12px)",
              }}
            >
              <SliceIcon
                size={26}
                style={{ color: draggedSlice.color || "#fff" }}
              />
            </div>
          );
        })()}

      {/* TOP HEADER */}
      <header
        className="shrink-0 flex items-center justify-between px-8 py-5 bg-[#0c0c0e] border-b border-zinc-800/60 z-10 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          {profiles.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => handleProfileTabChange(idx)}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeProfileIndex === idx ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent"}`}
            >
              {p.name}
            </button>
          ))}
          <button
            onClick={handleAddProfile}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-dashed border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            title="Add Profile"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex items-center gap-5">
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
            onClick={handleImport}
            className="text-sm font-medium text-zinc-400 hover:text-white px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Import
          </button>
          <button
            onClick={handleSaveAll}
            disabled={!isDirty || saveStatus === "saving"}
            className="ml-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg active:scale-95"
          >
            Save All
          </button>
        </div>
      </header>

      {/* MAIN SPLIT-SCREEN AREA */}
      <main className="flex-1 flex overflow-hidden">
        {/* LEFT: CANVAS */}
        <div className="flex-1 relative bg-[#09090b] flex items-center justify-center border-r border-zinc-800/50 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          ></div>

          <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-20 pointer-events-none">
            <div
              className="flex items-center gap-4 w-1/2 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={activeProfile?.name || ""}
                onChange={(e) => handleProfileNameChange(e.target.value)}
                className={`bg-transparent text-2xl font-bold text-white focus:outline-none border-b border-transparent focus:border-indigo-500/50 transition-colors w-full placeholder-zinc-700`}
                placeholder="Enter Profile Name..."
                spellCheck={false}
              />
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteProfile();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-semibold border border-red-500/20 transition-all pointer-events-auto shadow-sm"
            >
              <Trash2 size={16} /> Delete Profile
            </button>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleExport();
            }}
            className="absolute bottom-8 left-8 flex items-center gap-2 px-4 py-2.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-sm font-medium border border-zinc-700/50 transition-all shadow-lg backdrop-blur-sm z-20"
          >
            <Upload size={16} /> Export Profile
          </button>

          {/* Radial Canvas */}
          <div
            className="relative w-[600px] h-[600px] flex items-center justify-center mt-12"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 shadow-[0_0_30px_rgba(0,0,0,0.5)] z-0 flex items-center justify-center">
              <X
                className="text-zinc-600 opacity-50"
                size={28}
                strokeWidth={3}
              />
            </div>

            {/* วงแหวนหลัก (Main Ring) รัศมี 140 */}
            {renderRing(rootSlices, 140, false)}

            {/* วงแหวนโฟลเดอร์ (Outer Ring Arc) รัศมี 240 */}
            {activeFolderId &&
              renderRing(
                rootSlices.find((s) => s.id === activeFolderId)?.children || [],
                240,
                true,
              )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNewSlice();
            }}
            className="absolute bottom-8 right-8 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all hover:scale-105 active:scale-95 z-20"
            title="Add New Slice"
          >
            <Plus size={28} />
          </button>
        </div>

        {/* RIGHT: SLICE EDITOR PANEL */}
        <div
          className="w-1/3 min-w-[360px] max-w-[480px] shrink-0 bg-[#0c0c0e] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {editingSlice ? (
            <SliceEditor
              key={editingSlice.id}
              slice={editingSlice}
              onChange={handleUpdateSlice}
              onCancel={handleCancelEdit}
              onDelete={handleDeleteSlice}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4 p-8 text-center opacity-60">
              <MousePointer2 size={56} strokeWidth={1} />
              <div>
                <p className="text-base font-semibold text-zinc-300">
                  No Slice Selected
                </p>
                <p className="text-xs mt-2 max-w-[250px] mx-auto leading-relaxed">
                  Click a slice on the left canvas to edit its properties, or
                  drag and drop to reorder/move to folders.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
