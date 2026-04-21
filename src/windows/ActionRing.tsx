/**
 * ActionRing.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Fixed Center (400, 400) - ออกแบบมาเพื่อ Window ขนาด 800x800
 */

import React, { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import * as LucideIcons from "lucide-react";

// --- Types (ตรงตาม state.rs) ---
interface ApiSlice {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  actionType: string;
  actionData?: string | null;
  scriptArgs?: string[];
  children?: ApiSlice[] | null;
}

interface ApiProfile {
  id: string;
  slices: ApiSlice[];
  isDefault: boolean;
}

// ─── การตั้งค่าระยะวงแหวน (ล็อกค่าคงที่สำหรับหน้าต่าง 800x800) ───────────────────
const WINDOW_SIZE = 800;
const CX = 400; // จุดกึ่งกลางหน้าต่าง 800
const CY = 400;

const R_MAIN = 115;
const R_OUTER = 210;
const NODE_SIZE = 65;
const NODE_SIZE_HOV = 82;
const NODE_SIZE_CHILD = 55;
const NODE_SIZE_CHILD_HOV = 72;
const DEAD_ZONE = 40;

// ─── Helper: หาตำแหน่งที่เมาส์ Hover ─────────────────────────────────────────
function getHoveredItem(
  mx: number,
  my: number,
  mainSlices: ApiSlice[],
  activeFolderId: string | null,
): { type: "main" | "child"; id: string; index: number } | null {
  const dx = mx - CX;
  const dy = my - CY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < DEAD_ZONE) return null;

  const angle = Math.atan2(dy, dx);

  // 1. เช็ควงนอก (Children)
  if (activeFolderId && dist > R_MAIN + 40) {
    const folder = mainSlices.find((s) => s.id === activeFolderId);
    const children = folder?.children || [];
    if (children.length > 0) {
      const folderIdx = mainSlices.findIndex((s) => s.id === activeFolderId);
      const parentAngle =
        -Math.PI / 2 + (folderIdx * 2 * Math.PI) / mainSlices.length;
      const step = Math.PI / 6.5;
      const startAngle = parentAngle - ((children.length - 1) * step) / 2;

      let closestChildIdx = -1;
      let minDiff = Infinity;

      children.forEach((_, i) => {
        const childAngle = startAngle + i * step;
        const diff = Math.abs(
          Math.atan2(
            Math.sin(angle - childAngle),
            Math.cos(angle - childAngle),
          ),
        );
        if (diff < minDiff) {
          minDiff = diff;
          closestChildIdx = i;
        }
      });

      if (minDiff < step / 1.5) {
        return {
          type: "child",
          id: children[closestChildIdx].id,
          index: closestChildIdx,
        };
      }
    }
  }

  // 2. เช็ควงใน (Main Ring)
  if (mainSlices.length > 0 && dist <= R_MAIN + 45) {
    const step = (2 * Math.PI) / mainSlices.length;
    const origin = -Math.PI / 2 - step / 2;
    const normalised =
      (((angle - origin) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const idx = Math.min(Math.floor(normalised / step), mainSlices.length - 1);
    return { type: "main", id: mainSlices[idx].id, index: idx };
  }

  return null;
}

export default function ActionRing() {
  const [slices, setSlices] = useState<ApiSlice[]>([]);
  const [animKey, setAnimKey] = useState(0);

  const [hoveredMainId, setHoveredMainId] = useState<string | null>(null);
  const [hoveredChildId, setHoveredChildId] = useState<string | null>(null);
  const [clickedId, setClickedId] = useState<string | null>(null);

  const loadRealSlices = async () => {
    try {
      const profiles = await invoke<ApiProfile[]>("get_profiles");
      if (profiles && profiles.length > 0) {
        const activeProfile = profiles.find((p) => p.isDefault) || profiles[0];
        setSlices(activeProfile.slices);
      }
    } catch (err) {
      console.error("Load slices failed:", err);
    }
  };

  useEffect(() => {
    loadRealSlices();
    const unlistenShow = listen("ring:show", () => {
      loadRealSlices();
      setHoveredMainId(null);
      setHoveredChildId(null);
      setClickedId(null);
      setAnimKey((k) => k + 1);
    });
    return () => {
      unlistenShow.then((f) => f());
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") invoke("hide_action_ring").catch(console.error);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (clickedId !== null) return;
      const hovered = getHoveredItem(
        e.clientX,
        e.clientY,
        slices,
        hoveredMainId,
      );

      if (!hovered) {
        setHoveredMainId(null);
        setHoveredChildId(null);
      } else if (hovered.type === "main") {
        setHoveredMainId(hovered.id);
        setHoveredChildId(null);
      } else if (hovered.type === "child") {
        setHoveredChildId(hovered.id);
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [slices, hoveredMainId, clickedId]);

  const handleClick = useCallback(async () => {
    let targetSlice: ApiSlice | null = null;

    if (hoveredChildId && hoveredMainId) {
      const folder = slices.find((s) => s.id === hoveredMainId);
      targetSlice =
        folder?.children?.find((c) => c.id === hoveredChildId) || null;
    } else if (hoveredMainId) {
      targetSlice = slices.find((s) => s.id === hoveredMainId) || null;
    }

    if (targetSlice && targetSlice.actionType !== "folder") {
      setClickedId(targetSlice.id);

      // ปิดวงแหวนทันที
      await invoke("hide_action_ring");

      // ส่งข้อมูลให้ Rust (ส่งยกชุด Object ให้ตรงกับ struct ActionSlice ใน state.rs)
      try {
        await invoke("execute_action", { action: targetSlice });
      } catch (err) {
        console.error(`Execute failed:`, err);
      }
    } else if (!targetSlice || targetSlice.actionType !== "folder") {
      invoke("hide_action_ring").catch(console.error);
    }
  }, [hoveredMainId, hoveredChildId, slices]);

  return (
    // ครอบด้วย div ขนาดคงที่ 800x800 เพื่อให้จุด 400,400 คือกึ่งกลางหน้าต่างเป๊ะ
    <div
      className="w-[800px] h-[800px] select-none overflow-hidden relative"
      style={{ background: "transparent" }}
      onClick={handleClick}
    >
      <div
        key={animKey}
        className={`w-full h-full relative ${animKey > 0 ? "animate-spring-summon" : "opacity-0"}`}
      >
        {/* กากบาทกลาง */}
        <div
          className="absolute flex items-center justify-center rounded-full bg-zinc-800/90 z-10"
          style={{
            width: 46,
            height: 46,
            left: CX,
            top: CY,
            transform: "translate(-50%, -50%)",
          }}
        >
          <LucideIcons.X size={24} strokeWidth={3.5} className="text-red-500" />
        </div>

        {/* วงแหวนหลัก */}
        {slices.map((slice, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / slices.length;
          const nx = CX + R_MAIN * Math.cos(angle);
          const ny = CY + R_MAIN * Math.sin(angle);
          const active = hoveredMainId === slice.id;
          const isClicked = clickedId === slice.id;
          const Icon =
            (LucideIcons as any)[slice.icon || "Zap"] || LucideIcons.Zap;
          const size = isClicked
            ? NODE_SIZE - 10
            : active
              ? NODE_SIZE_HOV
              : NODE_SIZE;

          return (
            <div
              key={slice.id}
              style={{
                opacity: clickedId !== null && clickedId !== slice.id ? 0.2 : 1,
                transition: "opacity 0.2s",
              }}
            >
              <div
                className="absolute flex items-center justify-center rounded-full transition-all duration-200 z-20"
                style={{
                  width: size,
                  height: size,
                  left: nx,
                  top: ny,
                  transform: "translate(-50%, -50%)",
                  backgroundColor: active
                    ? slice.color || "#6366f1"
                    : "#C8C8D2",
                  color: active ? "white" : "#18181b",
                  boxShadow: active
                    ? `0 0 25px ${slice.color}99`
                    : "0 4px 10px rgba(0,0,0,0.3)",
                }}
              >
                <Icon size={active ? 36 : 28} strokeWidth={active ? 2.5 : 3} />
              </div>

              {slice.actionType === "folder" && (
                <div
                  className={`absolute pointer-events-none transition-all duration-200 w-6 h-6 flex items-center justify-center rounded-full z-10
                       ${active ? "bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.7)]" : "bg-white text-zinc-400"}`}
                  style={{
                    left: CX + (R_MAIN + (active ? 45 : 36)) * Math.cos(angle),
                    top: CY + (R_MAIN + (active ? 45 : 36)) * Math.sin(angle),
                    transform: `translate(-50%, -50%) rotate(${angle * (180 / Math.PI)}deg)`,
                  }}
                >
                  <LucideIcons.ChevronRight size={14} strokeWidth={3} />
                </div>
              )}

              {active && !hoveredChildId && (
                <div
                  className="absolute px-4 py-1.5 bg-white rounded-full shadow-lg z-50 transition-all duration-200"
                  style={{
                    left: CX + (R_MAIN + 75) * Math.cos(angle),
                    top: CY + (R_MAIN + 75) * Math.sin(angle),
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <span className="text-zinc-900 font-semibold text-sm">
                    {slice.label}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* วงแหวนย่อย */}
        {hoveredMainId &&
          slices.find((s) => s.id === hoveredMainId)?.actionType === "folder" &&
          (() => {
            const folder = slices.find((s) => s.id === hoveredMainId)!;
            const children = folder.children || [];
            const folderIdx = slices.findIndex((s) => s.id === hoveredMainId);
            const parentAngle =
              -Math.PI / 2 + (folderIdx * 2 * Math.PI) / slices.length;
            const step = Math.PI / 6.5;
            const startAngle = parentAngle - ((children.length - 1) * step) / 2;

            return children.map((child, i) => {
              const angle = startAngle + i * step;
              const nx = CX + R_OUTER * Math.cos(angle);
              const ny = CY + R_OUTER * Math.sin(angle);
              const active = hoveredChildId === child.id;
              const isClicked = clickedId === child.id;
              const Icon =
                (LucideIcons as any)[child.icon || "Zap"] || LucideIcons.Zap;
              const size = isClicked
                ? NODE_SIZE_CHILD - 10
                : active
                  ? NODE_SIZE_CHILD_HOV
                  : NODE_SIZE_CHILD;

              return (
                <div
                  key={child.id}
                  style={{
                    opacity:
                      clickedId !== null && clickedId !== child.id ? 0.2 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  <div
                    className="absolute flex items-center justify-center rounded-full transition-all duration-200 z-30"
                    style={{
                      width: size,
                      height: size,
                      left: nx,
                      top: ny,
                      transform: "translate(-50%, -50%)",
                      backgroundColor: active
                        ? child.color || "#6366f1"
                        : "#E4E4EB",
                      color: active ? "white" : "#3f3f46",
                      boxShadow: active
                        ? `0 0 20px ${child.color}80`
                        : "0 4px 10px rgba(0,0,0,0.2)",
                    }}
                  >
                    <Icon
                      size={active ? 30 : 24}
                      strokeWidth={active ? 2.5 : 3}
                    />
                  </div>
                  {active && (
                    <div
                      className="absolute px-4 py-1.5 bg-white rounded-full shadow-lg z-50 transition-all duration-200"
                      style={{
                        left: CX + (R_OUTER + 65) * Math.cos(angle),
                        top: CY + (R_OUTER + 65) * Math.sin(angle),
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <span className="text-zinc-900 font-semibold text-sm">
                        {child.label}
                      </span>
                    </div>
                  )}
                </div>
              );
            });
          })()}
      </div>
    </div>
  );
}
