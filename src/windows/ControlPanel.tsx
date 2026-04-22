/**
 * ControlPanel.tsx — Action Ring Settings Dashboard (Auto-Save + Clean Icons Version)
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  Settings,
  MousePointer2,
  Plus,
  X,
  Upload,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Zap,
  Lightbulb,
} from "lucide-react";

// นำเข้าไฟล์ Settings และ IconMap ที่แยกไว้
import SettingsPanel from "./SettingsPanel";
import ProTipModal from "./components/ProTipModal";
import SliceEditor from "./components/SliceEditor";
import { ICON_MAP, ICON_LIST } from "./IconMap";

// ─── 1. Types & Interfaces ────────────────────────────────────────────────
export type ActionTypeValue = 
  | "shortcut" 
  | "launch" 
  | "script" 
  | "folder"
  | "text_snippet"
  | "media"
  | "system"
  | "switch_profile"
  | "multi_action";

export interface ApiSlice {
  id: string;
  label: string;
  icon?: string | null;
  color?: string | null;
  actionType: ActionTypeValue;
  actionData?: string | null;
  scriptArgs?: string[];
  children?: ApiSlice[] | null;
}

export interface ApiProfile {
  id: string;
  name: string;
  appMatcher?: string | null;
  isDefault: boolean;
  slices: ApiSlice[];
}

// ─── 2. Constants ─────────────────────────────────────────────────────────

export const ACCENT_PALETTE = [
  // --- Vibrant Colors ---
  "#4285f4", "#0ea5e9", "#10b981", "#f59e0b",
  "#f43f5e", "#8b5cf6", "#ec4899", "#84cc16",
  // --- Pastel Colors ---
  "#93c5fd", "#7dd3fc", "#6ee7b7", "#fcd34d",
  "#fda4af", "#c4b5fd", "#fbcfe8", "#bef264",
];

const R_MAIN = 120;
const R_OUTER = 220;

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

// ─── 5. Main Control Panel Component ──────────────────────────────────────
export default function ControlPanel() {
  const [currentView, setCurrentView] = useState<"profiles" | "settings">(
    "profiles",
  );
  const [showProTip, setShowProTip] = useState(false);
  const [profiles, setProfiles] = useState<ApiProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeProfileIndex, setActiveProfileIndex] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const lastHoveredId = useRef<string | null>(null);
  const [liveOrder, setLiveOrder] = useState<string[] | null>(null);

  // 💥 ─── ระบบลากวาง Profile Tabs ─── 💥
  const [draggedProfileId, setDraggedProfileId] = useState<string | null>(null);
  const [liveProfiles, setLiveProfiles] = useState<ApiProfile[] | null>(null);
  const [dragProfilePos, setDragProfilePos] = useState<{ x: number; y: number } | null>(null);
  const [profileDragOffset, setProfileDragOffset] = useState({ x: 0, y: 0 });
  const [profileDragWidth, setProfileDragWidth] = useState(120);

  const liveProfilesRef = useRef<ApiProfile[] | null>(null);
  useEffect(() => { liveProfilesRef.current = liveProfiles; }, [liveProfiles]);

  const activeProfile = profiles[activeProfileIndex];
  const rootSlices = activeProfile?.slices ?? [];

  const editingSlice = (() => {
    if (!editingId) return undefined;
    let found = rootSlices.find((s) => s.id === editingId);
    if (!found && activeFolderId) {
      found = rootSlices
        .find((s) => s.id === activeFolderId)
        ?.children?.find((s) => s.id === editingId);
    }
    return found;
  })();

  const isEditingChild = !!(
    activeFolderId &&
    rootSlices
      .find((s) => s.id === activeFolderId)
      ?.children?.some((c) => c.id === editingId)
  );

  // --- Auto-Save System (Debounced) ---
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const autoSaveToBackend = useCallback((newProfiles: ApiProfile[]) => {
    setProfiles(newProfiles);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      invoke("save_profiles", { profiles: newProfiles }).catch(console.error);
    }, 400);
  }, []);

  useEffect(() => {
    invoke<ApiProfile[]>("get_profiles")
      .then((data) => {
        if (data) setProfiles(data);
        setLoading(false);
      })
      .catch((e) => {
        setLoadError(String(e));
        setLoading(false);
      });
  }, []);

  // 💥 ─── จัดการ Pointer Drag & Drop สำหรับ Profile Tabs ─── 💥
  const handleProfilePointerDown = (e: React.PointerEvent, profileId: string) => {
    if (e.button !== 0) return;
    
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setProfileDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setProfileDragWidth(rect.width);

    setDraggedProfileId(profileId);
    setLiveProfiles([...profiles]);
    setDragProfilePos({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!draggedProfileId) { document.body.style.cursor = ""; return; }
    document.body.style.cursor = "grabbing";

    const onMove = (e: PointerEvent) => {
      setDragProfilePos({ x: e.clientX, y: e.clientY });
      
      // หาเป้าหมายที่ถูกลากทับ
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const targetBtn = el?.closest("[data-profile-id]");
      if (targetBtn) {
        const targetId = targetBtn.getAttribute("data-profile-id");
        if (targetId && targetId !== draggedProfileId) {
          setLiveProfiles(prev => {
            if (!prev) return prev;
            const next = [...prev];
            const from = next.findIndex(p => p.id === draggedProfileId);
            const to = next.findIndex(p => p.id === targetId);
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
      if (liveProfilesRef.current) {
        const newProfiles = [...liveProfilesRef.current];
        const currentActiveId = profiles[activeProfileIndex]?.id;
        
        autoSaveToBackend(newProfiles); // เซฟตำแหน่งใหม่ลงระบบ
        
        // 💥 อัปเดต Index ปัจจุบันให้ชี้ไปที่ Profile ตัวเดิมเสมอ แม้มันจะถูกย้ายตำแหน่งไปแล้ว
        if (currentActiveId) {
          const newActiveIdx = newProfiles.findIndex(p => p.id === currentActiveId);
          if (newActiveIdx !== -1 && newActiveIdx !== activeProfileIndex) {
            setActiveProfileIndex(newActiveIdx);
          }
        }
      }
      setDraggedProfileId(null);
      setLiveProfiles(null);
      setDragProfilePos(null);
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
  }, [draggedProfileId, profiles, activeProfileIndex, autoSaveToBackend]);
  // ────────────────────────────────────────────────────────

  // 💥 ─── ระบบ Copy / Paste / Delete สไลซ์แบบข้าม Profile ได้ ─── 💥
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" || 
        target.tagName === "TEXTAREA" || 
        target.tagName === "SELECT" ||
        confirmModal !== null 
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (editingId) {
          let found = rootSlices.find((s) => s.id === editingId);
          if (!found && activeFolderId) {
            found = rootSlices
              .find((s) => s.id === activeFolderId)
              ?.children?.find((s) => s.id === editingId);
          }
          if (found) {
            localStorage.setItem("actionRing_copiedSlice", JSON.stringify(found));
          }
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        const copiedStr = localStorage.getItem("actionRing_copiedSlice");
        if (copiedStr) {
          try {
            const copiedData = JSON.parse(copiedStr) as ApiSlice;
            const cloneSlice = (s: ApiSlice): ApiSlice => ({
              ...s,
              id: uid(),
              children: s.children ? s.children.map(cloneSlice) : null
            });
            const newSlice = cloneSlice(copiedData);

            const newProfiles = profiles.map((p, i) => {
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
            });

            autoSaveToBackend(newProfiles);
            setEditingId(newSlice.id);

          } catch (err) {
            console.error("Failed to paste slice:", err);
          }
        }
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (editingId) {
          handleDeleteSlice();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [editingId, activeFolderId, activeProfileIndex, profiles, rootSlices, autoSaveToBackend, confirmModal]); 
  // ───────────────────────────────────────────────────────

  // --- State Handlers ---
  function handleAddProfile() {
    const initialSlice = emptySlice();
    const newProfile: ApiProfile = {
      id: uid(),
      name: `New Profile`,
      appMatcher: null,
      isDefault: profiles.length === 0,
      slices: [initialSlice],
    };
    const updated = [...profiles, newProfile];
    autoSaveToBackend(updated);
    setActiveProfileIndex(updated.length - 1);
  }

  function handleProfileTabChange(idx: number) {
    // ป้องกันการคลิกตอนกำลังลาก
    if (draggedProfileId) return; 
    
    setActiveProfileIndex(idx);
    setActiveFolderId(null);
    setEditingId(null);
  }

  function handleProfileNameChange(newName: string) {
    const updated = profiles.map((p, i) =>
      i === activeProfileIndex ? { ...p, name: newName } : p,
    );
    autoSaveToBackend(updated);
  }

  function handleSetDefaultProfile() {
    const updated = profiles.map((p, i) => ({
      ...p,
      isDefault: i === activeProfileIndex,
    }));
    autoSaveToBackend(updated);
  }

  function handleStartEdit(slice: ApiSlice) {
    setEditingId(slice.id);

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
    const newProfiles = profiles.map((p, i) => {
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
    });
    autoSaveToBackend(newProfiles);
  }

  function handleNewSlice() {
    const newSlice = emptySlice();
    const newProfiles = profiles.map((p, i) => {
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
    });

    autoSaveToBackend(newProfiles);
    setEditingId(newSlice.id);
  }

  function handleDeleteSlice() {
    if (!editingId) return;
    setConfirmModal({
      title: "Delete Item",
      message:
        "Are you sure you want to delete this item? This action cannot be undone.",
      onConfirm: () => {
        const newProfiles = profiles.map((p, i) => {
          if (i !== activeProfileIndex) return p;
          let newSlices = [...p.slices];

          const rootIdx = newSlices.findIndex((s) => s.id === editingId);
          if (rootIdx !== -1) {
            newSlices.splice(rootIdx, 1);
            if (activeFolderId === editingId) setActiveFolderId(null);
          } else if (activeFolderId) {
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
          }
          return { ...p, slices: newSlices };
        });

        autoSaveToBackend(newProfiles);
        setEditingId(null);
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
        const newProfiles = profiles.filter((_, i) => i !== activeProfileIndex);
        autoSaveToBackend(newProfiles);
        setActiveProfileIndex(Math.max(0, activeProfileIndex - 1));
        setActiveFolderId(null);
        setEditingId(null);
      },
    });
  }

  // --- Fast Pointer Drag & Drop Logic (Slices) ---
  const handlePointerDown = (e: React.PointerEvent, _id: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartPos.current) return;
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;

    if (!draggedId && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      const id = e.currentTarget.getAttribute("data-slice-id");
      if (id) {
        setDraggedId(id);
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

    if (draggedId) {
      setDragPos({ x: e.clientX, y: e.clientY });

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const targetBtn = el?.closest("[data-slice-id]");

      if (targetBtn) {
        const targetId = targetBtn.getAttribute("data-slice-id");

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
              setHoveredId(targetId);
            } else {
              setLiveOrder((prev) => {
                if (!prev) return prev;
                const next = [...prev];
                const from = next.indexOf(draggedId);
                const to = next.indexOf(targetId);
                if (from !== -1 && to !== -1) {
                  next.splice(from, 1);
                  next.splice(to, 0, draggedId);
                }
                return next;
              });
              setHoveredId(null);
            }
          } else if (!isSameLevel) {
            setHoveredId(targetId);
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

    if (draggedId && activeFolderId) {
      const isDraggedChild = rootSlices
        .find((s) => s.id === activeFolderId)
        ?.children?.some((c) => c.id === draggedId);

      if (isDraggedChild && dragPos && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const localX = dragPos.x - rect.left;
        const localY = dragPos.y - rect.top;
        const dx = localX - rect.width / 2;
        const dy = localY - rect.height / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (!hoveredId && dist > 80 && dist < 170) {
          const newProfiles = profiles.map((p, idx) => {
            if (idx !== activeProfileIndex) return p;
            const newSlices = [...p.slices];
            const folderIdx = newSlices.findIndex(
              (s) => s.id === activeFolderId,
            );

            if (folderIdx !== -1) {
              const folder = { ...newSlices[folderIdx] };
              const draggedChild = folder.children?.find(
                (c) => c.id === draggedId,
              );

              if (draggedChild) {
                folder.children = (folder.children || []).filter(
                  (c) => c.id !== draggedId,
                );
                newSlices[folderIdx] = folder;
                newSlices.push(draggedChild);
              }
            }
            return { ...p, slices: newSlices };
          });

          autoSaveToBackend(newProfiles);

          setActiveFolderId(null);
          setEditingId(null);

          dragStartPos.current = null;
          lastHoveredId.current = null;
          setDraggedId(null);
          setDragPos(null);
          setHoveredId(null);
          setLiveOrder(null);
          return;
        }
      }
    }

    if (!draggedId) {
      handleStartEdit(slice);
    } else {
      if (
        hoveredId &&
        rootSlices.find((s) => s.id === hoveredId)?.actionType === "folder"
      ) {
        const newProfiles = profiles.map((profile, idx) => {
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
        });
        autoSaveToBackend(newProfiles);
      } else if (liveOrder) {
        const newProfiles = profiles.map((profile, idx) => {
          if (idx !== activeProfileIndex) return profile;
          let newSlices = [...profile.slices];

          const isDraggingInFolder =
            activeFolderId &&
            rootSlices
              .find((s) => s.id === activeFolderId)
              ?.children?.some((c) => c.id === draggedId);

          if (isDraggingInFolder) {
            const fIdx = newSlices.findIndex((s) => s.id === activeFolderId);
            if (fIdx !== -1 && newSlices[fIdx].children) {
              const newChildren = liveOrder
                .map((id) => newSlices[fIdx].children!.find((c) => c.id === id))
                .filter(Boolean) as ApiSlice[];
              newSlices[fIdx] = { ...newSlices[fIdx], children: newChildren };
            }
          } else {
            newSlices = liveOrder
              .map((id) => newSlices.find((s) => s.id === id))
              .filter(Boolean) as ApiSlice[];
          }
          return { ...profile, slices: newSlices };
        });
        autoSaveToBackend(newProfiles);
      }
    }

    dragStartPos.current = null;
    lastHoveredId.current = null;
    setDraggedId(null);
    setDragPos(null);
    setHoveredId(null);
    setLiveOrder(null);
  };

  async function handleExport() {
    if (!activeProfile) return;
    try {
      const exportProfile = { ...activeProfile, isDefault: false };
      await invoke("export_profile", { profile: exportProfile });
    } catch (e) {
      console.error(e);
    }
  }

  async function handleImport() {
    try {
      const importedProfile = await invoke<ApiProfile>("import_profile");
      const updatedProfiles = [...profiles, importedProfile];
      autoSaveToBackend(updatedProfiles);
      setActiveProfileIndex(updatedProfiles.length - 1);
    } catch (e) {
      console.error(e);
    }
  }

  const renderRing = (
    slicesToRender: ApiSlice[],
    radius: number,
    isOuter: boolean,
  ) => {
    const isDraggingInThisRing =
      draggedId && liveOrder && isOuter === !!activeFolderId;
    const orderArray = isDraggingInThisRing
      ? liveOrder
      : slicesToRender.map((s) => s.id);

    let parentAngle = 0;
    if (isOuter && activeFolderId) {
      const rootOrder = rootSlices.map((s) => s.id);
      const folderIdx = rootOrder.indexOf(activeFolderId);
      if (folderIdx !== -1) {
        parentAngle =
          (folderIdx / rootOrder.length) * 2 * Math.PI - Math.PI / 2;
      }
    }

    const elements: React.ReactNode[] = [];

    slicesToRender.forEach((slice) => {
      const i = orderArray.indexOf(slice.id);
      if (i === -1) return;

      const total = orderArray.length;
      let angle = 0;

      if (!isOuter) {
        angle = (i / total) * 2 * Math.PI - Math.PI / 2;
      } else {
        const step = Math.PI / 6.5;
        const arcSpan = (total - 1) * step;
        angle = parentAngle - arcSpan / 2 + i * step;
      }

      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      const isSelected = editingId === slice.id;
      const isBeingDragged = draggedId === slice.id;
      const isBeingHovered = hoveredId === slice.id;
      const isActiveFolder = activeFolderId === slice.id;
      const SliceIcon = ICON_MAP[slice.icon || "Zap"] || Zap;

      if (slice.actionType === "folder" && !isOuter) {
        const arrowR = radius + 32 + 15;
        const arrowX = Math.cos(angle) * arrowR;
        const arrowY = Math.sin(angle) * arrowR;

        elements.push(
          <div
            key={`${slice.id}-floating-arrow`}
            className={`absolute pointer-events-none transition-all duration-300 w-8 h-8 flex items-center justify-center rounded-full
                   ${isActiveFolder ? " text-blue-500" : " text-zinc-400"}
                `}
            style={{
              left: "50%",
              top: "50%",
              transform: `translate(calc(-50% + ${arrowX}px), calc(-50% + ${arrowY}px))`,
              zIndex: 5,
            }}
          >
            <ChevronRight
              size={isActiveFolder ? "24" : "18"}
              strokeWidth={3}
              style={{ transform: `rotate(${angle * (180 / Math.PI)}deg)` }}
            />
          </div>,
        );
      }

      elements.push(
        <button
          key={slice.id}
          data-slice-id={slice.id}
          onPointerDown={(e) => handlePointerDown(e, slice.id)}
          onPointerMove={handlePointerMove}
          onPointerUp={(e) => handlePointerUp(e, slice)}
          className={`absolute w-[55px] h-[55px] rounded-full flex items-center justify-center shadow-xl transition-all duration-300 z-10 touch-none
            ${isBeingDragged ? "opacity-0 pointer-events-none" : ""}
            ${isSelected && !isBeingDragged ? "ring-4 ring-indigo-500/50 scale-110" : !isBeingDragged && "hover:scale-110"}
            ${isBeingHovered && slice.actionType === "folder" ? "ring-4 ring-rose-500 scale-125" : ""}
            ${!isSelected && !isBeingHovered && !isBeingDragged ? "border border-white/10 hover:border-white/30" : ""}
            ${isOuter ? "scale-90 opacity-95" : ""}
          `}
          style={{
            left: "50%",
            top: "50%",
            backgroundColor: slice.color ? `${slice.color}50` : "#333",
            backdropFilter: "blur(8px)",
            transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
            cursor: "grab",
            zIndex: isBeingDragged ? 0 : isSelected ? 30 : 10,
          }}
        >
          <SliceIcon
            size={isOuter ? 22 : 26}
            style={{ color: slice.color || "#fff" }}
          />
        </button>,
      );
    });

    return elements;
  };

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

  // --- Rendering Router ---
  if (currentView === "settings") {
    return <SettingsPanel onBack={() => setCurrentView("profiles")} />;
  }

  // ตัวแปรสำหรับแสดงผล Profile Array แบบ Real-time
  const displayProfiles = liveProfiles || profiles;

  return (
    <div
      className="absolute inset-0 w-full h-screen m-0 p-0 flex flex-col bg-[#09090b] text-zinc-100 overflow-hidden font-sans"
      onClick={() => {
        setActiveFolderId(null);
        setEditingId(null);
      }}
    >
      {/* 💥 Ghost Element สำหรับตอนลาก Profile 💥 */}
      {draggedProfileId && dragProfilePos && (() => {
        const p = displayProfiles.find(s => s.id === draggedProfileId);
        if (!p) return null;
        
        const realIdx = profiles.findIndex(orig => orig.id === p.id);
        const isActive = activeProfileIndex === realIdx;

        return (
          <div
            className={`fixed pointer-events-none z-[9999] flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold shadow-[0_0_40px_rgba(0,0,0,0.5)] scale-105 transition-transform origin-top-left duration-300
              ${isActive ? "bg-[#18181b] text-indigo-300 border border-indigo-500/50" : "bg-[#0c0c0e] text-zinc-200 border border-zinc-700/80"}
            `}
            style={{
              left: dragProfilePos.x - profileDragOffset.x,
              top: dragProfilePos.y - profileDragOffset.y,
              width: profileDragWidth,
              margin: 0
            }}
          >
            {p.isDefault && <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>}
            {p.name}
          </div>
        );
      })()}

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

      {/* Ghost Element สำหรับตอนลาก Slice วงแหวน */}
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

      <header
        className="shrink-0 flex items-center justify-between px-8 py-5 bg-[#0c0c0e] border-b border-zinc-800/60 z-10 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 💥 ส่วนเรนเดอร์ Profile Tabs 💥 */}
        <div className="flex items-center gap-3">
          {displayProfiles.map((p) => {
            // หา Index จริงๆ ใน Array profiles เพื่อให้ปุ่มอ้างอิงได้อย่างถูกต้อง
            const realIdx = profiles.findIndex(orig => orig.id === p.id);
            const isActive = activeProfileIndex === realIdx;

            return (
              <button
                key={p.id}
                data-profile-id={p.id}
                onPointerDown={(e) => handleProfilePointerDown(e, p.id)}
                onClick={() => handleProfileTabChange(realIdx)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ease-out touch-none cursor-grab active:cursor-grabbing
                  ${draggedProfileId === p.id ? "opacity-0 scale-95" : "opacity-100 scale-100"}
                  ${isActive && draggedProfileId !== p.id 
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" 
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent"}
                `}
              >
                {p.isDefault && (
                  <div
                    className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"
                    title="Active Profile"
                  ></div>
                )}
                {p.name}
              </button>
            );
          })}
          <button
            onClick={handleAddProfile}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-dashed border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            title="Add Profile"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex items-center gap-5">
          <button 
            onClick={() => setShowProTip(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded-xl text-sm font-bold border border-yellow-500/20 transition-all shadow-sm"
          >
            <Lightbulb size={16} className="animate-pulse" />
            Pro Tip
          </button>
          <button
            onClick={handleImport}
            className="text-sm font-medium text-zinc-400 hover:text-white px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Import
          </button>

          <div className="h-6 w-px bg-zinc-800 mx-2"></div>

          <button
            onClick={() => setCurrentView("settings")}
            className="flex items-center px-1 py-2.5 text-zinc-300 hover:text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
          >
            <Settings size={22} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative bg-[#09090b] flex items-center justify-center border-r border-zinc-800/50 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          ></div>

          <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start z-20 pointer-events-none">
            <div
              className="flex items-start gap-4 w-2/3 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {activeFolderId && (
                <button
                  onClick={() => {
                    setActiveFolderId(null);
                    setEditingId(null);
                  }}
                  className="flex items-center justify-center w-10 h-10 mt-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full transition-colors shadow-md shrink-0"
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              <div className="flex flex-col gap-2 w-full max-w-[300px]">
                <input
                  type="text"
                  value={
                    activeFolderId
                      ? activeProfile?.slices.find(
                          (s) => s.id === activeFolderId,
                        )?.label || "Folder"
                      : activeProfile?.name || ""
                  }
                  onChange={(e) => {
                    if (!activeFolderId)
                      handleProfileNameChange(e.target.value);
                  }}
                  readOnly={!!activeFolderId}
                  className={`bg-transparent text-2xl font-bold text-white focus:outline-none border-b border-transparent ${!activeFolderId && "focus:border-indigo-500/50"} transition-colors w-full placeholder-zinc-700`}
                  placeholder="Enter Profile Name..."
                  spellCheck={false}
                />

                {!activeFolderId &&
                  (activeProfile?.isDefault ? (
                    <span className="flex items-center gap-2 px-3 py-1.5 text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg text-xs font-semibold w-fit">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.8)]"></div>
                      Active Profile
                    </span>
                  ) : (
                    <button
                      onClick={handleSetDefaultProfile}
                      className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold border border-zinc-700 transition-all shadow-sm w-fit pointer-events-auto"
                    >
                      Use this profile
                    </button>
                  ))}
              </div>
            </div>

            {!activeFolderId && (
              <button
                onClick={(e) => {
              e.stopPropagation();
              handleExport();
            }}
                className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-sm font-medium border border-zinc-700/50 transition-all shadow-lg backdrop-blur-sm z-20 pointer-events-auto"
              >
                <Upload size={16} /> Export Profile
              </button>
            )}
          </div>

          
          {!activeFolderId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteProfile();
              }}
              className="absolute bottom-8 left-8 z-[999] flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-semibold border border-red-500/20 transition-all pointer-events-auto shadow-sm"
            >
              <Trash2 size={16} className="pointer-events-none" /> 
              <span className="pointer-events-none">Delete Profile</span>
            </button>
            )}
            


          <div
            ref={canvasRef}
            className="relative w-[600px] h-[600px] flex items-center justify-center mt-12"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="absolute left-1/2 top-1/2 w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 shadow-[0_0_30px_rgba(0,0,0,0.5)] z-0 flex items-center justify-center"
              style={{ transform: "translate(-50%, -50%)" }}
            >
              <X
                className="text-zinc-600 opacity-50"
                size={25}
                strokeWidth={3}
              />
            </div>

            {renderRing(rootSlices, R_MAIN, false)}
            {activeFolderId &&
              renderRing(
                rootSlices.find((s) => s.id === activeFolderId)?.children || [],
                R_OUTER,
                true,
              )}
          </div>

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleNewSlice();
            }}
            className="absolute bottom-8 right-8 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all hover:scale-105 active:scale-95 z-50 pointer-events-auto"
            title="Add New Slice"
          >
            <Plus size={28} />
          </button>
        </div>

        <div
          className="w-1.5 bg-zinc-800 hover:bg-indigo-500 cursor-col-resize shrink-0 z-50 transition-colors"
          onPointerDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const rightPanel = document.getElementById("right-editor-panel");
            if (!rightPanel) return;
            const startWidth = rightPanel.offsetWidth;

            const onMove = (moveEvent: PointerEvent) => {
              const delta = startX - moveEvent.clientX;
              const newWidth = Math.max(320, Math.min(startWidth + delta, 800));
              rightPanel.style.width = `${newWidth}px`;
            };

            const onUp = () => {
              window.removeEventListener("pointermove", onMove);
              window.removeEventListener("pointerup", onUp);
              document.body.style.cursor = "default";
            };

            document.body.style.cursor = "col-resize";
            window.addEventListener("pointermove", onMove);
            window.addEventListener("pointerup", onUp);
          }}
        />

        {/* RIGHT: SLICE EDITOR PANEL */}
        <div
          id="right-editor-panel"
          className="shrink-0 bg-[#0c0c0e] overflow-y-auto"
          style={{ width: 400 }}
          onClick={(e) => e.stopPropagation()}
        >
          {editingSlice ? (
            <SliceEditor
              key={editingSlice.id}
              slice={editingSlice}
              onChange={handleUpdateSlice}
              onDelete={handleDeleteSlice}
              isChildItem={isEditingChild}
              profiles={profiles}
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
      {showProTip && (
        <ProTipModal onClose={() => setShowProTip(false)} />
      )}
    </div>
  );
}