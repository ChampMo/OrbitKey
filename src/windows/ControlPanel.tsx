/**
 * ControlPanel.tsx — Action Ring Settings Dashboard (Refactored Themes)
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
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
  Undo2, 
  Redo2,
  Download,
  MoreHorizontal,
  CheckCircle2
} from "lucide-react";
import { getVersion } from '@tauri-apps/api/app';
import SettingsPanel from "./SettingsPanel";
import ProTipModal from "./components/ProTipModal";
import SliceEditor from "./components/SliceEditor";
import { ICON_MAP } from "./IconMap";
import { check } from '@tauri-apps/plugin-updater';
// 💥 นำเข้า THEMES จากไฟล์ Theme.tsx 💥
import UpdateModal from './components/UpdateModal';
import { ThemeId, THEMES } from "./Theme";
import Alert from "./components/Alert";
import SplashScreen from "./components/SplashScreen"; // นำเข้า Component
import { getCurrentWindow } from "@tauri-apps/api/window";

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
  | "multi_action"
  | "open_app" 
  | "open_control_panel";



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

interface AppSettings { 
  globalHotkey: string; 
  startWithOs: boolean; 
  ringScale: number; 
  closeAfterExec: boolean; 
  triggerMode: string; 
  animSpeed: string; 
  deadzone: number; 
  centerAction: string; 
  theme: ThemeId;
  switchAnimStyle: string;
}




export const ACCENT_PALETTE = [
  "#4285f4", "#0ea5e9", "#10b981", "#f59e0b",
  "#f43f5e", "#8b5cf6", "#ec4899", "#84cc16",
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
  const [currentView, setCurrentView] = useState<"profiles" | "settings">("profiles");
  const [showProTip, setShowProTip] = useState(false);
  const [profiles, setProfiles] = useState<ApiProfile[]>([]);
  const [config, setConfig] = useState<AppSettings | null>(null);
  
  const [past, setPast] = useState<ApiProfile[][]>([]);
  const [future, setFuture] = useState<ApiProfile[][]>([]);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState('');
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

  const [draggedProfileId, setDraggedProfileId] = useState<string | null>(null);
  const [liveProfiles, setLiveProfiles] = useState<ApiProfile[] | null>(null);
  const [dragProfilePos, setDragProfilePos] = useState<{ x: number; y: number } | null>(null);
  const [profileDragOffset, setProfileDragOffset] = useState({ x: 0, y: 0 });
  const [profileDragWidth, setProfileDragWidth] = useState(120);
  const [pendingUpdate, setPendingUpdate] = React.useState<any>(null);
  const [availableUpdate, setAvailableUpdate] = useState<any>(null);
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

  

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const autoSaveToBackend = useCallback((newProfiles: ApiProfile[], isHistoryAction = false) => {
    if (!isHistoryAction) {
      setPast((prev) => {
        const nextPast = [...prev, profiles];
        return nextPast.slice(-30); 
      });
      setFuture([]); 
    }
    
    setProfiles(newProfiles);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      invoke("save_profiles", { profiles: newProfiles }).catch(console.error);
    }, 400);
  }, [profiles]);

  const handleUndo = useCallback(() => {
    if (past.length === 0) return;
    const previousState = past[past.length - 1];
    const newPast = past.slice(0, -1);
    
    setPast(newPast);
    setFuture((prev) => [profiles, ...prev]);
    autoSaveToBackend(previousState, true);
  }, [past, profiles, autoSaveToBackend]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const nextState = future[0];
    const newFuture = future.slice(1);
    
    setPast((prev) => [...prev, profiles]);
    setFuture(newFuture);
    autoSaveToBackend(nextState, true);
  }, [future, profiles, autoSaveToBackend]);

  const [alertConfig, setAlertConfig] = useState({
      isOpen: false,
      title: '',
      message: '',
      type: 'error' as 'error' | 'success' | 'info'
    });

  useEffect(() => {
    getVersion().then(setAppVersion);
  }, []);

  // ค้นหา useEffect ที่โหลดข้อมูล (บรรทัดประมาณ 185)
  useEffect(() => {
    const startLoad = Date.now(); // จับเวลาตอนเริ่มโหลด

    Promise.all([
      invoke<ApiProfile[]>("get_profiles").catch(() => null),
      invoke<any>("get_settings").catch(() => null)
    ]).then(([data, settings]) => {
      if (data) setProfiles(data);
      if (settings) setConfig(settings);

      // 💥 บังคับให้โชว์หน้า Intro อย่างน้อย 1.5 วินาที
      const elapsed = Date.now() - startLoad;
      const minWait = 1500;
      
      setTimeout(() => {
        setLoading(false); // บอกว่าโหลดเสร็จแล้วนะ (แต่หน้า Splash จะเริ่มเฟดออกก่อน)
      }, Math.max(0, minWait - elapsed));

    }).catch((e) => {
      setLoadError(String(e));
      setLoading(false);
    });
  }, []);

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
        
        autoSaveToBackend(newProfiles);
        
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

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
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
  }, [editingId, activeFolderId, activeProfileIndex, profiles, rootSlices, autoSaveToBackend, confirmModal, handleUndo, handleRedo]); 

  useEffect(() => {
    const autoCheck = async () => {
      try {
        const update = await check();
        if (update) {
          setPendingUpdate(update); // ถ้าเจอเวอร์ชันใหม่ ข้อมูลจะถูกเก็บที่นี่
          setAvailableUpdate(update);
        }
      } catch (e) {
        console.error("Update check failed:", e);
      }
    };
    autoCheck();
  }, []);

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
      setAlertConfig({
        isOpen: true,
        title: "Action Restricted",
        message: "You cannot delete the last profile. OrbitKey needs at least one profile to stay in orbit! 🛰️",
        type: 'error'
      });
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
      const newProfile: ApiProfile = {
        ...importedProfile,
        id: uid(),
        isDefault: false,
      };

      const updatedProfiles = [...profiles, newProfile];
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
                   ${isActiveFolder ? " text-blue-500" : " text-current opacity-50"}
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
            ${isSelected && !isBeingDragged 
              ? `ring-4 ${activeTheme.ringColor} scale-110` // 💥 ดึงสีวงแหวนประจำธีม
              : !isBeingDragged ? "hover:scale-110" : ""}
            ${isBeingHovered && slice.actionType === "folder" ? "ring-4 ring-rose-500 scale-125" : ""}
            ${!isSelected && !isBeingHovered && !isBeingDragged ? `border ${activeTheme.sliceBorder}` : ""} // 💥 ดึงสีขอบประจำธีม
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

  useEffect(() => {
    let unlistenFn: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const appWindow = getCurrentWindow();
        
        unlistenFn = await appWindow.onCloseRequested(async (event) => {
          // เบรกการปิดหน้าต่างจริงๆ
          event.preventDefault();
          
          // สั่งซ่อนหน้าต่างแทน (แอปยังรันอยู่ วงแหวนยังใช้ได้)
          await appWindow.hide(); 
        });
      } catch (error) {
        console.error("OrbitKey Error:", error);
      }
    };

    setupListener();

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

if (showSplash) {
    const loadingTheme = config ? THEMES[config.theme] : THEMES.dark;
    return (
      <SplashScreen 
        theme={loadingTheme} 
        isReady={!loading} // เมื่อ loading เป็น false แปลว่าพร้อมแล้ว ให้เริ่มเฟดออก
        onComplete={() => setShowSplash(false)} // พอมันจางหายไปจนสุดแล้ว ค่อยลบทิ้ง
      />
    );
  }
  if (loadError)
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center text-red-400">
        Error: {loadError}
      </div>
    );

  const activeTheme = THEMES[config?.theme ?? "dark"];

  if (currentView === "settings" && config) {
    return (
      <SettingsPanel 
        initialConfig={config!}
        activeTheme={activeTheme}
        onBack={() => {
          setCurrentView("profiles");
          invoke<AppSettings>("get_settings").then(c => { if(c) setConfig(c); }).catch(console.error);
        }} 
      />
    );
  }

  const displayProfiles = liveProfiles || profiles;
  

  return (
    <div
      className={`absolute inset-0 w-full h-screen m-0 p-0 flex flex-col overflow-hidden font-sans transition-colors duration-500 ${activeTheme.bg} ${activeTheme.text}`}
      onClick={() => {
        setActiveFolderId(null);
        setEditingId(null);
      }}
    >
      {/* Ghost Dragging Element */}
      {draggedProfileId && dragProfilePos && (() => {
        const p = displayProfiles.find(s => s.id === draggedProfileId);
        if (!p) return null;
        const realIdx = profiles.findIndex(orig => orig.id === p.id);
        const isActive = activeProfileIndex === realIdx;
        return (
          <div
            className={`fixed pointer-events-none z-[9999] flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold shadow-[0_0_40px_rgba(0,0,0,0.2)] scale-105 transition-transform origin-top-left duration-300
              ${isActive ? "ring-2 ring-indigo-500/50" : ""} ${activeTheme.panel} border ${activeTheme.border} ${activeTheme.text}
            `}
            style={{ left: dragProfilePos.x - profileDragOffset.x, top: dragProfilePos.y - profileDragOffset.y, width: profileDragWidth, margin: 0 }}
          >
            {p.isDefault && <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>}
            {p.name}
          </div>
        );
      })()}

      {confirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className={`${activeTheme.panel} border ${activeTheme.border} p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4`}>
            <h3 className="text-lg font-bold mb-2">{confirmModal.title}</h3>
            <p className="opacity-70 text-sm mb-6 leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmModal(null)} className={`px-4 py-2 rounded-xl text-sm font-medium ${activeTheme.isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'} opacity-80 hover:opacity-100 transition-colors`}>Cancel</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} className="px-5 py-2 rounded-xl text-sm font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-colors">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {draggedId && dragPos && (() => {
          let draggedSlice = rootSlices.find((s) => s.id === draggedId);
          if (!draggedSlice && activeFolderId)
            draggedSlice = rootSlices.find((s) => s.id === activeFolderId)?.children?.find((s) => s.id === draggedId);

          if (!draggedSlice) return null;
          const SliceIcon = ICON_MAP[draggedSlice.icon || "Zap"] || Zap;
          return (
            <div
              className="fixed pointer-events-none z-[100] w-[64px] h-[64px] rounded-full flex flex-col items-center justify-center shadow-2xl scale-110 ring-4 ring-indigo-500/80"
              style={{
                left: dragPos.x, top: dragPos.y, transform: "translate(-50%, -50%)",
                backgroundColor: draggedSlice.color ? `${draggedSlice.color}90` : "#333", backdropFilter: "blur(12px)",
              }}
            >
              <SliceIcon size={26} style={{ color: draggedSlice.color || "#fff" }} />
            </div>
          );
        })()}

      <header
        className={`shrink-0 flex items-center justify-between px-8 py-5 border-b z-10 shadow-sm transition-colors duration-500 ${activeTheme.panel} ${activeTheme.border}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* --- ฝั่งซ้าย: Profile Tabs & Add/Import Menu --- */}
        <div className="flex items-center gap-3">
          {displayProfiles.map((p) => {
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
                    ? (activeTheme.isDark ? "bg-white/10 text-white border border-white/20 shadow-sm" : "bg-white text-black border border-black/10 shadow-sm") 
                    : `opacity-60 hover:opacity-100 ${activeTheme.isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'} border border-transparent`}
                `}
              >
                {p.isDefault && <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" title="Active Profile"></div>}
                {p.name}
              </button>
            );
          })}

          {/* ปุ่ม (+) ที่ขยายตัวเองเป็นเมนู Dropdown */}
          <div className="relative group w-10 h-10">
            
            {/* ตัวปุ่ม (+) เดิม (จะจางหายไปและหดลงนิดหน่อยตอน Hover) */}
            <button 
              onClick={handleAddProfile} 
              className={`absolute inset-0 w-full h-full flex items-center justify-center rounded-xl border border-dashed transition-all duration-300 ease-out group-hover:opacity-0 group-hover:scale-75 ${activeTheme.isDark ? 'border-white/30' : 'border-black/30'}`} 
              title="Add or Import Profile"
            >
              <Plus size={20} className="opacity-60" />
            </button>
            
            {/* กล่องเมนูที่จะ "ขยาย" ออกมาจากจุดของปุ่ม (+) */}
            <div 
              className={`absolute top-0 left-0 w-48 p-2 border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-out z-50 transform origin-top-left scale-50 group-hover:scale-100 overflow-hidden ${activeTheme.isDark ? 'bg-[#1a1a1c] border-white/10 text-zinc-300' : 'bg-white border-black/10 text-zinc-700'}`}
            >
              <button 
                onClick={handleAddProfile} 
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${activeTheme.isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
              >
                <Plus size={14} className="opacity-60" /> New Profile
              </button>
              <button 
                onClick={handleImport} 
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg text-left transition-colors 
                  ${activeTheme.isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'} 
                  ${activeTheme.accentText}`} // 💥 ใช้สีตามธีมตรงนี้
              >
                <Download size={14} className="opacity-60" /> 
                Import Profile
              </button>
            </div>

          </div>
        </div>

        {/* --- ฝั่งขวา: Utilities & Settings --- */}
        <div className="flex items-center gap-5">
          {/* Pro Tip */}
          <button onClick={() => setShowProTip(true)} className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-xl text-xs font-bold border border-yellow-500/20 transition-all shadow-sm">
            <Lightbulb size={14} className="animate-pulse" /> Pro Tip
          </button>
          
          {/* Undo / Redo Group */}
          <div className={`flex items-center gap-1 rounded-xl p-1 border ${activeTheme.isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
            <button onClick={handleUndo} disabled={past.length === 0} className={`p-1.5 opacity-70 hover:opacity-100 ${activeTheme.isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'} rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-all`} title="Undo (Ctrl+Z)">
              <Undo2 size={16} />
            </button>
            <div className={`w-px h-4 ${activeTheme.isDark ? 'bg-white/20' : 'bg-black/20'}`}></div>
            <button onClick={handleRedo} disabled={future.length === 0} className={`p-1.5 opacity-70 hover:opacity-100 ${activeTheme.isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'} rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-all`} title="Redo (Ctrl+Shift+Z)">
              <Redo2 size={16} />
            </button>
          </div>
          
          <div className={`h-6 w-px mx-1 ${activeTheme.isDark ? 'bg-white/20' : 'bg-black/10'}`}></div>
          
          {/* Settings */}
          <div className="relative">
            <button onClick={() => setCurrentView("settings")} className={`p-2 opacity-60 hover:opacity-100 hover:rotate-45 rounded-xl transition-all duration-300 ${activeTheme.isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`} title="Settings">
              <Settings size={22} />
            </button>

            {/* 🔴 ถ้ามีอัปเดต ให้โชว์จุดแดงมุมขวาบน + อนิเมชันกระพริบ */}
            {availableUpdate && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#0c0c0e] animate-pulse pointer-events-none" />
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className={`flex-1 relative flex items-center justify-center border-r overflow-hidden transition-colors duration-500 ${activeTheme.bg} ${activeTheme.border}`}>
          
          <div 
            className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${activeTheme.isDark ? 'opacity-[0.04]' : 'opacity-[0.08]'}`} 
            style={{ backgroundImage: "radial-gradient(currentColor 1.5px, transparent 1.5px)", backgroundSize: "32px 32px" }}
          ></div>

          <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start z-20 pointer-events-none">
  
            {/* =========================================
                ฝั่งซ้าย: ชื่อ Profile + สถานะ (Identity)
            ========================================= */}
            <div className="flex items-start gap-4 w-full max-w-[500px] pointer-events-auto" onClick={(e) => e.stopPropagation()}>
              
              {/* ปุ่ม Back (ตอนอยู่ใน Folder) */}
              {activeFolderId && (
                <button onClick={() => { setActiveFolderId(null); setEditingId(null); }} className={`flex items-center justify-center w-10 h-10 mt-1 ${activeTheme.isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'} rounded-full transition-colors shadow-sm shrink-0`}>
                  <ChevronLeft size={20} />
                </button>
              )}

              <div className="flex flex-col gap-1 w-full">
                {/* แถวที่ 1: ช่องกรอกชื่อ */}
                <input
                  type="text"
                  value={activeFolderId ? activeProfile?.slices.find((s) => s.id === activeFolderId)?.label || "Folder" : activeProfile?.name || ""}
                  onChange={(e) => { if (!activeFolderId) handleProfileNameChange(e.target.value); }}
                  readOnly={!!activeFolderId}
                  className={`bg-transparent text-3xl font-bold tracking-tight focus:outline-none border-b-2 border-transparent transition-all w-full max-w-[300px] pb-1 placeholder-current placeholder-opacity-40 text-current ${
                    !activeFolderId 
                      ? (activeTheme.isDark ? "hover:border-white/20 focus:border-indigo-500" : "hover:border-black/10 focus:border-indigo-500") 
                      : ""
                  }`}
                  placeholder="Enter Profile Name..." 
                  spellCheck={false}
                />

                {/* แถวที่ 2: ป้าย Active หรือ ปุ่ม Use this profile (กลับมาอยู่ด้านล่าง) */}
                {!activeFolderId && (
                  <div className="h-8 flex items-center mt-1"> 
                    {activeProfile?.isDefault ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 text-green-500 bg-green-500/10 border border-green-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-default">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]"></div> Active Profile
                      </span>
                    ) : (
                      <button 
                        onClick={handleSetDefaultProfile} 
                        className={`flex items-center gap-2 px-3 py-1.5 ${activeTheme.isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'} text-current rounded-lg text-xs font-semibold transition-all shadow-sm w-fit pointer-events-auto`}
                      >
                        <CheckCircle2 size={14} className="text-green-500" /> Use this profile
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* =========================================
                ฝั่งขวา: ปุ่ม ... (Profile Actions)
            ========================================= */}
            {!activeFolderId && (
              <div className="relative group shrink-0 pointer-events-auto">
                <button 
                  className={`p-2 rounded-xl border border-transparent transition-all opacity-40 hover:opacity-100 ${activeTheme.isDark ? 'hover:bg-white/10 hover:border-white/20' : 'hover:bg-black/5 hover:border-black/10'}`}
                  title="Profile Options"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal size={24} />
                </button>

                {/* Dropdown Menu (เปลี่ยนเป็น right-0 และ origin-top-right เพื่อกางเข้าหาซ้าย) */}
                <div className={`absolute top-full right-0 mt-2 w-48 p-1.5 border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform origin-top-right scale-95 group-hover:scale-100 ${activeTheme.isDark ? 'bg-[#1a1a1c] border-white/10 text-zinc-300' : 'bg-white border-black/10 text-zinc-700'}`}>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleExport(); }} 
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${activeTheme.isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                  >
                    <Upload size={16} className="opacity-60" /> Export Profile
                  </button>

                  <div className={`h-px w-full my-1 ${activeTheme.isDark ? 'bg-white/10' : 'bg-black/5'}`}></div>

                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      handleDeleteProfile(); 
                    }} 
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors text-red-500 hover:bg-red-500/10 hover:text-red-600"
                  >
                    <Trash2 size={16} className="opacity-70" /> Delete Profile
                  </button>

                </div>
              </div>
            )}

          </div>

          <div ref={canvasRef} className="relative w-[600px] h-[600px] flex items-center justify-center mt-12" onClick={(e) => e.stopPropagation()}>
            <div className={`absolute left-1/2 top-1/2 w-12 h-12 rounded-full ${activeTheme.panel} border ${activeTheme.border} shadow-lg z-0 flex items-center justify-center backdrop-blur-md`} style={{ transform: "translate(-50%, -50%)" }}>
              <X className="text-current opacity-30" size={25} strokeWidth={3} />
            </div>
            
            {renderRing(rootSlices, R_MAIN, false)}
            {activeFolderId && renderRing(rootSlices.find((s) => s.id === activeFolderId)?.children || [], R_OUTER, true)}
          </div>

          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNewSlice(); }} 
            // 💥 ดึงสีปุ่มหลักมาจาก Theme เลย ไม่ต้องเช็ค isDark ซ้อนกันให้เหนื่อย
            className={`absolute bottom-8 right-8 w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-50 pointer-events-auto
              ${activeTheme.primaryBtn}
            `}
            title="Add New Slice"
          >
            <Plus size={28} />
          </button>
        </div>

        <div 
          className={`w-1.5 cursor-col-resize shrink-0 z-50 transition-colors ${activeTheme.isDark ? 'bg-white/5 hover:bg-white/20' : 'bg-black/5 hover:bg-black/20'}`} 
          
          // 1. ป้องกันการคลิกพื้นหลังเวลาแค่กดโดนเส้นกั้น
          onClick={(e) => e.stopPropagation()} 
          
          onPointerDown={(e) => {
            // 2. หยุด Event ไม่ให้ส่งต่อไปยัง Canvas
            e.stopPropagation(); 
            e.preventDefault();

            const startX = e.clientX;
            const rightPanel = document.getElementById("right-editor-panel");
            if (!rightPanel) return;

            // 3. ใช้ Pointer Capture เพื่อให้การลากไม่หลุดแม้เม้าส์จะออกจากเส้น 1.5px
            const target = e.currentTarget;
            target.setPointerCapture(e.pointerId);

            const startWidth = rightPanel.offsetWidth;

            const onMove = (moveEvent: PointerEvent) => {
              const delta = startX - moveEvent.clientX;
              const newWidth = Math.max(320, Math.min(startWidth + delta, 800));
              rightPanel.style.width = `${newWidth}px`;
            };

            const onUp = (upEvent: PointerEvent) => {
              // 4. ลบ Event และคืนค่า Cursor
              window.removeEventListener("pointermove", onMove);
              window.removeEventListener("pointerup", onUp);
              target.releasePointerCapture(upEvent.pointerId); // คืนค่า Capture
              document.body.style.cursor = "default";
            };

            document.body.style.cursor = "col-resize";
            window.addEventListener("pointermove", onMove);
            window.addEventListener("pointerup", onUp);
          }}
        />

        <div id="right-editor-panel" className={`shrink-0 overflow-y-auto transition-colors duration-500 ${activeTheme.panel}`} style={{ width: 400 }} onClick={(e) => e.stopPropagation()}>
          {editingSlice ? (
            <SliceEditor 
              // 💥 ใส่ ! หลัง editingSlice เพื่อแก้ Error "possibly undefined"
              key={editingSlice!.id} 
              slice={editingSlice!} 
              onChange={handleUpdateSlice} 
              onDelete={handleDeleteSlice} 
              isChildItem={isEditingChild} 
              profiles={profiles} 
              activeTheme={activeTheme} 
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-current space-y-4 p-8 text-center opacity-40">
              <MousePointer2 size={56} strokeWidth={1} />
              <div>
                <p className="text-base font-semibold">No Slice Selected</p>
                <p className="text-xs mt-2 max-w-[250px] mx-auto leading-relaxed opacity-70">
                  Click a slice on the left canvas to edit its properties, or drag and drop to reorder/move to folders.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
      {/* 💥 ส่ง activeTheme ให้ ProTipModal */}
      {showProTip && <ProTipModal onClose={() => setShowProTip(false)} activeTheme={activeTheme} />}
      <UpdateModal 
        update={pendingUpdate} 
        onClose={() => setPendingUpdate(null)} 
        currentTheme={activeTheme} 
      />
      <Alert 
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        activeTheme={activeTheme}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
      />
      <div className="absolute bottom-6 left-8 flex items-center gap-2 opacity-30 transition-opacity duration-300">
  <div className={`w-1.5 h-1.5 rounded-full ${activeTheme.isDark ? 'bg-green-400' : 'bg-green-600'}`} />
  <p className={`text-[10px] font-bold tracking-widest uppercase ${
    activeTheme.isDark ? 'text-white' : 'text-zinc-900'
  }`}>
    v{appVersion || '0.1.0'}
  </p>
</div>
    </div>
  );
}