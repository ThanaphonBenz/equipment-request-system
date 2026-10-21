"use client";

import { useState } from "react";

// กราฟแท่งแนวนอน (สีเดียว เทียบขนาด) ป้ายชื่ออยู่ด้านบน ค่าอยู่ปลายแท่ง
const BAR_COLOR = "#2a78d6";
const BAR_HOVER = "#1c5cab";

export interface BarItem {
  key: string;
  label: React.ReactNode;
  value: number;
  tooltip?: string;
}

export function HorizontalBarList({
  items,
  unit,
  emptyText = "ยังไม่มีข้อมูล",
}: {
  items: BarItem[];
  unit: string;
  emptyText?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(...items.map((i) => i.value), 0);
  const total = items.reduce((s, i) => s + i.value, 0);

  if (items.length === 0 || max === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">{emptyText}</p>;
  }

  return (
    <ul className="space-y-3" onMouseLeave={() => setHover(null)}>
      {items.map((item) => {
        const active = hover === item.key;
        const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
        return (
          <li
            key={item.key}
            className="relative -mx-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50"
            onMouseEnter={() => setHover(item.key)}
          >
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0 truncate">{item.label}</div>
              <span className="shrink-0 font-semibold text-slate-900">
                {item.value} <span className="font-normal text-slate-400">{unit}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-r-[4px] transition-colors"
                style={{ width: `${(item.value / max) * 100}%`, backgroundColor: active ? BAR_HOVER : BAR_COLOR }}
              />
            </div>
            {active && (
              <div className="pointer-events-none absolute -top-9 right-2 z-10 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white shadow-lg">
                {item.tooltip ?? `${item.value} ${unit}`} · {percent}% ของทั้งหมด
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
