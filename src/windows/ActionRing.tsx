/**
 * ActionRing.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Node-based Radial Menu (Bubble Style)
 */

import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import * as LucideIcons from "lucide-react"; // Import Icons

interface ApiSlice {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  actionType: string;
  actionData: string;
  scriptArgs?: string[];
}

interface ApiProfile {
  slices: ApiSlice[];
}

// ─── การตั้งค่าขนาดและระยะ ───────────────────────────────────────────────────
const WINDOW_SIZE = 450;
const CX = WINDOW_SIZE / 2;
const CY = WINDOW_SIZE / 2;

const RING_RADIUS = 105; // ระยะห่างจากจุดศูนย์กลางถึงตัวปุ่ม
const NODE_SIZE = 65; // ขนาดปุ่มปกติ
const NODE_SIZE_HOV = 80; // ขนาดปุ่มตอนเอาเมาส์ชี้
const DEAD_ZONE = 40; // รัศมีตรงกลาง (ถ้าเมาส์อยู่ตรงนี้ จะไม่เลือกปุ่มไหนเลย)

function getHoveredIndex(mx: number, my: number, n: number): number | null {
  if (n === 0) return null;
  const dx = mx - CX,
    dy = my - CY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // ถ้าเมาส์อยู่ใกล้ตรงกลางเกินไป ให้ถือว่าเป็นการยกเลิก (Cancel)
  if (dist < DEAD_ZONE) return null;

  const angle = Math.atan2(dy, dx);
  const step = (2 * Math.PI) / n;
  const origin = -Math.PI / 2 - step / 2;
  const normalised =
    (((angle - origin) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return Math.min(Math.floor(normalised / step), n - 1);
}

export default function ActionRing() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const [slices, setSlices] = useState<ApiSlice[]>([]);
  const [clickedIdx, setClickedIdx] = useState<number | null>(null);

  const loadRealSlices = async () => {
    try {
      const profiles = await invoke<ApiProfile[]>("get_profiles");
      if (profiles && profiles.length > 0) setSlices(profiles[0].slices);
    } catch (err) {
      console.error("Failed to load real slices:", err);
    }
  };

  const n = slices.length;

  useEffect(() => {
    loadRealSlices();
    const subs = [
      listen("ring:show", () => {
        loadRealSlices();
        setHoveredIdx(null);
        setClickedIdx(null);
        setAnimKey((k) => k + 1);
      }),
      listen("ring:hide", () => setHoveredIdx(null)),
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
      if (clickedIdx === null)
        setHoveredIdx(getHoveredIndex(e.clientX, e.clientY, n));
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [n, clickedIdx]);

  const handleClick = useCallback(() => {
    if (hoveredIdx !== null && slices[hoveredIdx]) {
      setClickedIdx(hoveredIdx);
      const slice = slices[hoveredIdx];

      // หน่วงเวลาเล็กน้อยให้เห็นอนิเมชั่นหดตัวก่อนทำงาน
      setTimeout(() => {
        invoke("execute_action", {
          action: {
            actionType: slice.actionType,
            actionData: slice.actionData,
            scriptArgs: slice.scriptArgs ?? [],
          },
        }).catch((err) => {
          console.error(`execute_action failed:`, err);
          invoke("hide_action_ring").catch(console.error);
        });
      }, 120);
    } else {
      // ถ้าคลิกตรงกลาง (Dead zone) หรือที่ว่าง ให้ปิดวงแหวน
      invoke("hide_action_ring").catch(console.error);
    }
  }, [hoveredIdx, slices]);

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
            backgroundColor: hoveredIdx === null ? "#EEEEEE" : "#DBDBDB", // สว่างขึ้นถ้าเมาส์อยู่ตรงกลาง
            opacity: 0.9,
            transform: hoveredIdx === null ? "scale(1.1)" : "scale(1)",
          }}
        >
          <LucideIcons.X size={24} strokeWidth={3.5} className="text-red-500" />
        </div>

        {/* ── ปุ่ม Slices (โหนดรอบๆ) ── */}
        {slices.map((slice, i) => {
          // คำนวณองศาพิกัดของแต่ละปุ่ม
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
          const nx = CX + RING_RADIUS * Math.cos(angle);
          const ny = CY + RING_RADIUS * Math.sin(angle);

          const isActive = hoveredIdx === i;
          const isClicked = clickedIdx === i;

          // คำนวณขนาดปุ่ม
          const size = isClicked
            ? NODE_SIZE - 10
            : isActive
              ? NODE_SIZE_HOV
              : NODE_SIZE;
          const sliceColor = slice.color ?? "#6366f1";
          const IconComponent =
            (LucideIcons as any)[slice.icon || "Zap"] || LucideIcons.Zap;

          // คำนวณพิกัดของ Tooltip (ป้ายชื่อ) ให้ดันออกไปด้านนอกวงแหวน
          const tooltipDist = RING_RADIUS + (isActive ? 75 : 60);
          const tx = CX + tooltipDist * Math.cos(angle);
          const ty = CY + tooltipDist * Math.sin(angle);

          return (
            <div
              key={slice.id}
              style={{
                opacity: clickedIdx !== null && !isClicked ? 0.2 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {/* ตัวปุ่มวงกลม */}
              <div
                className="absolute flex items-center justify-center rounded-full transition-all duration-200 ease-out"
                style={{
                  width: size,
                  height: size,
                  left: nx - size / 2,
                  top: ny - size / 2,
                  backgroundColor: isActive ? sliceColor : "#C8C8D2", // สีเทาตอนปกติ สีหลักตอน Hover
                  boxShadow: isActive
                    ? `0 0 25px ${sliceColor}99`
                    : "0 4px 10px rgba(0,0,0,0.3)",
                  color: isActive ? "#ffffff" : "#18181b", // ไอคอนสีดำตอนปกติ สีขาวตอน Hover
                }}
              >
                <IconComponent
                  size={isActive ? 36 : 28}
                  strokeWidth={isActive ? 2.5 : 3}
                />
              </div>

              {/* ป้ายชื่อ (Tooltip สีขาว) */}
              <div
                className="absolute flex items-center justify-center px-4 py-1.5 bg-white rounded-full shadow-lg pointer-events-none transition-all duration-200 ease-out"
                style={{
                  left: tx,
                  top: ty,
                  transform: "translate(-50%, -50%)", // จัดให้อยู่กึ่งกลางพิกัด
                  opacity: isActive ? 1 : 0,
                  scale: isActive ? 1 : 0.8,
                }}
              >
                <span className="text-zinc-900 font-semibold text-sm tracking-wide">
                  {slice.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
