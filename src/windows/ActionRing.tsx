/**
 * ActionRing.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Node-based Radial Menu (Supports Nested Folders)
 */

import React, { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import * as LucideIcons from "lucide-react";

// --- Types ---
interface ApiSlice {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  actionType: string;
  actionData: string;
  scriptArgs?: string[];
  children?: ApiSlice[] | null;
}

interface ApiProfile {
  slices: ApiSlice[];
}

// ─── การตั้งค่าขนาดและระยะ ───────────────────────────────────────────────────
const WINDOW_SIZE = 600; // เพิ่มขนาดหน้าต่างเพื่อรองรับวงนอก
const CX = WINDOW_SIZE / 2;
const CY = WINDOW_SIZE / 2;

const R_MAIN = 110; // รัศมีวงแหวนหลัก
const R_OUTER = 200; // รัศมีวงแหวนลูก (Folder)
const NODE_SIZE = 65; // ขนาดปุ่มปกติ
const NODE_SIZE_HOV = 80; // ขนาดปุ่มตอนเอาเมาส์ชี้
const NODE_SIZE_CHILD = 55; // ขนาดปุ่มลูก
const NODE_SIZE_CHILD_HOV = 70;
const DEAD_ZONE = 40; // รัศมีตรงกลาง (ถ้าเมาส์อยู่ตรงนี้ จะไม่เลือกปุ่มไหนเลย)

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

  // 1. เช็คว่าชี้วงนอก (Children) อยู่หรือไม่ ถ้าระยะเกินกึ่งกลางระหว่าง 2 วง
  if (activeFolderId && dist > R_MAIN + (R_OUTER - R_MAIN) / 2) {
    const folderIdx = mainSlices.findIndex((s) => s.id === activeFolderId);
    const children = mainSlices[folderIdx]?.children || [];
    if (children.length > 0) {
      const parentAngle =
        -Math.PI / 2 + (folderIdx * 2 * Math.PI) / mainSlices.length;
      const step = Math.PI / 6.5;
      const arcSpan = (children.length - 1) * step;
      const startAngle = parentAngle - arcSpan / 2;

      // คำนวณหามุมที่ใกล้ที่สุดในวงนอก
      let closestChildIdx = -1;
      let minDiff = Infinity;

      children.forEach((_, i) => {
        const childAngle = startAngle + i * step;
        // Normalize ให้เทียบกันได้
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

      // ถ้ามุมอยู่ในระยะทำการ (ประมาณครึ่ง step) ถือว่า Hover ติด
      if (minDiff < step / 1.5) {
        return {
          type: "child",
          id: children[closestChildIdx].id,
          index: closestChildIdx,
        };
      }
    }
  }

  // 2. ถ้าไม่ได้ชี้วงนอก ให้เช็ควงใน (Main Ring)
  if (mainSlices.length > 0 && dist <= R_MAIN + (R_OUTER - R_MAIN) / 2) {
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

  // State สำหรับ Hover และ Click
  const [hoveredMainId, setHoveredMainId] = useState<string | null>(null);
  const [hoveredChildId, setHoveredChildId] = useState<string | null>(null);
  const [clickedId, setClickedId] = useState<string | null>(null);

  const loadRealSlices = async () => {
    try {
      const profiles = await invoke<ApiProfile[]>("get_profiles");
      if (profiles && profiles.length > 0) setSlices(profiles[0].slices);
    } catch (err) {
      console.error("Failed to load real slices:", err);
    }
  };

  useEffect(() => {
    loadRealSlices();
    const subs = [
      listen("ring:show", () => {
        loadRealSlices();
        setHoveredMainId(null);
        setHoveredChildId(null);
        setClickedId(null);
        setAnimKey((k) => k + 1);
      }),
      listen("ring:hide", () => {
        setHoveredMainId(null);
        setHoveredChildId(null);
      }),
    ];
    return () => {
      subs.forEach((p) => p.then((fn) => fn()));
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

  const handleClick = useCallback(() => {
    // หา Slice ที่กำลังจะถูกกด
    let targetSlice: ApiSlice | null = null;

    if (hoveredChildId && hoveredMainId) {
      const folder = slices.find((s) => s.id === hoveredMainId);
      targetSlice =
        folder?.children?.find((c) => c.id === hoveredChildId) || null;
    } else if (hoveredMainId) {
      targetSlice = slices.find((s) => s.id === hoveredMainId) || null;
    }

    if (targetSlice) {
      // ** ป้องกันการคลิก Folder โง่ๆ แล้วแอปปิด **
      // ถ้าเป้าหมายคือโฟลเดอร์ เราไม่ต้องทำอะไร ให้มันกางวงนอกค้างไว้แบบนั้นแหละ
      if (targetSlice.actionType === "folder") return;

      setClickedId(targetSlice.id);

      setTimeout(() => {
        invoke("execute_action", {
          action: {
            actionType: targetSlice!.actionType,
            actionData: targetSlice!.actionData,
            scriptArgs: targetSlice!.scriptArgs ?? [],
          },
        }).catch((err) => {
          console.error(`execute_action failed:`, err);
          invoke("hide_action_ring").catch(console.error);
        });
      }, 120);
    } else {
      // กด Deadzone ยกเลิก
      invoke("hide_action_ring").catch(console.error);
    }
  }, [hoveredMainId, hoveredChildId, slices]);

  const renderTooltip = (
    label: string,
    tx: number,
    ty: number,
    isActive: boolean,
  ) => (
    <div
      className="absolute flex items-center justify-center px-4 py-1.5 bg-white rounded-full shadow-lg pointer-events-none transition-all duration-200 ease-out"
      style={{
        left: tx,
        top: ty,
        transform: "translate(-50%, -50%)",
        opacity: isActive ? 1 : 0,
        scale: isActive ? 1 : 0.8,
        zIndex: 50,
      }}
    >
      <span className="text-zinc-900 font-semibold text-sm tracking-wide">
        {label}
      </span>
    </div>
  );

  return (
    <div
      className="w-screen h-screen select-none relative"
      style={{ background: "transparent" }}
      onClick={handleClick}
    >
      <div
        key={animKey}
        className={`w-full h-full relative ${animKey > 0 ? "animate-spring-summon" : "opacity-0"}`}
        style={{ transformOrigin: "center" }}
      >
        {/* ── ปุ่ม Cancel ตรงกลาง (กากบาทสีแดง) ── */}
        <div
          className="absolute flex items-center justify-center rounded-full transition-all duration-200"
          style={{
            width: 46,
            height: 46,
            left: CX - 23,
            top: CY - 23,
            backgroundColor:
              hoveredMainId === null && hoveredChildId === null
                ? "#EEEEEE"
                : "#DBDBDB",
            opacity: 0.9,
            transform:
              hoveredMainId === null && hoveredChildId === null
                ? "scale(1.1)"
                : "scale(1)",
            zIndex: 10,
          }}
        >
          <LucideIcons.X size={24} strokeWidth={3.5} className="text-red-500" />
        </div>

        {/* ── วาดวงแหวนหลัก (Main Ring) ── */}
        {slices.map((slice, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / slices.length;
          const nx = CX + R_MAIN * Math.cos(angle);
          const ny = CY + R_MAIN * Math.sin(angle);

          const isHovered = hoveredMainId === slice.id;
          const isFolder = slice.actionType === "folder";
          const isClicked = clickedId === slice.id;

          const size = isClicked
            ? NODE_SIZE - 10
            : isHovered
              ? NODE_SIZE_HOV
              : NODE_SIZE;
          const sliceColor = slice.color ?? "#6366f1";
          const IconComponent =
            (LucideIcons as any)[slice.icon || "Zap"] || LucideIcons.Zap;

          // ไม่ต้องโชว์ Tooltip หลัก ถ้ากำลัง Hover ลูกมันอยู่
          const showTooltip = isHovered && !hoveredChildId;
          const tooltipDist = R_MAIN + (showTooltip ? 75 : 60);
          const tx = CX + tooltipDist * Math.cos(angle);
          const ty = CY + tooltipDist * Math.sin(angle);

          return (
            <div
              key={slice.id}
              style={{
                opacity: clickedId !== null && !isClicked ? 0.2 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {/* ปุ่มวงแหวนหลัก */}
              <div
                className="absolute flex items-center justify-center rounded-full transition-all duration-200 ease-out z-20"
                style={{
                  width: size,
                  height: size,
                  left: nx - size / 2,
                  top: ny - size / 2,
                  backgroundColor: isHovered ? sliceColor : "#C8C8D2",
                  boxShadow: isHovered
                    ? `0 0 25px ${sliceColor}99`
                    : "0 4px 10px rgba(0,0,0,0.3)",
                  color: isHovered ? "#ffffff" : "#18181b",
                }}
              >
                <IconComponent
                  size={isHovered ? 36 : 28}
                  strokeWidth={isHovered ? 2.5 : 3}
                />
              </div>

              {/* หัวลูกศรบอก Folder */}
              {isFolder && (
                <div
                  className={`absolute pointer-events-none transition-all duration-200 w-6 h-6 flex items-center justify-center rounded-full z-10
                       ${isHovered ? "bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.7)]" : "bg-white text-zinc-400"}
                    `}
                  style={{
                    left:
                      CX + (R_MAIN + (isHovered ? 45 : 36)) * Math.cos(angle),
                    top:
                      CY + (R_MAIN + (isHovered ? 45 : 36)) * Math.sin(angle),
                    transform: `translate(-50%, -50%) rotate(${angle * (180 / Math.PI)}deg)`,
                  }}
                >
                  <LucideIcons.ChevronRight size={14} strokeWidth={3} />
                </div>
              )}

              {/* Tooltip วงหลัก */}
              {renderTooltip(slice.label, tx, ty, showTooltip)}
            </div>
          );
        })}

        {/* ── วาดวงแหวนย่อย (Outer Ring) เมื่อโฟกัส Folder ── */}
        {hoveredMainId &&
          slices.find((s) => s.id === hoveredMainId)?.actionType === "folder" &&
          (() => {
            const folderIdx = slices.findIndex((s) => s.id === hoveredMainId);
            const children = slices[folderIdx].children || [];
            if (children.length === 0) return null;

            const parentAngle =
              -Math.PI / 2 + (folderIdx * 2 * Math.PI) / slices.length;
            const step = Math.PI / 6.5;
            const arcSpan = (children.length - 1) * step;
            const startAngle = parentAngle - arcSpan / 2;

            return children.map((child, i) => {
              const angle = startAngle + i * step;
              const nx = CX + R_OUTER * Math.cos(angle);
              const ny = CY + R_OUTER * Math.sin(angle);

              const isHovered = hoveredChildId === child.id;
              const isClicked = clickedId === child.id;

              const size = isClicked
                ? NODE_SIZE_CHILD - 10
                : isHovered
                  ? NODE_SIZE_CHILD_HOV
                  : NODE_SIZE_CHILD;
              const sliceColor = child.color ?? "#6366f1";
              const IconComponent =
                (LucideIcons as any)[child.icon || "Zap"] || LucideIcons.Zap;

              const tooltipDist = R_OUTER + (isHovered ? 65 : 50);
              const tx = CX + tooltipDist * Math.cos(angle);
              const ty = CY + tooltipDist * Math.sin(angle);

              return (
                <div
                  key={child.id}
                  style={{
                    opacity: clickedId !== null && !isClicked ? 0.2 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  <div
                    className="absolute flex items-center justify-center rounded-full transition-all duration-200 ease-out z-30"
                    style={{
                      width: size,
                      height: size,
                      left: nx - size / 2,
                      top: ny - size / 2,
                      backgroundColor: isHovered ? sliceColor : "#E4E4EB",
                      boxShadow: isHovered
                        ? `0 0 20px ${sliceColor}80`
                        : "0 4px 10px rgba(0,0,0,0.2)",
                      color: isHovered ? "#ffffff" : "#3f3f46",
                    }}
                  >
                    <IconComponent
                      size={isHovered ? 30 : 24}
                      strokeWidth={isHovered ? 2.5 : 3}
                    />
                  </div>
                  {renderTooltip(child.label, tx, ty, isHovered)}
                </div>
              );
            });
          })()}
      </div>
    </div>
  );
}
