"use client";

import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ค่าวันที่ใช้รูปแบบ YYYY-MM-DD ตามเวลาท้องถิ่น ("" = ไม่กำหนด)
export type DateRange = { from: string; to: string };

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const monthFormatter = new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" });
const shortFormatter = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" });
const fullFormatter = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" });

const PRESETS: { label: string; range: () => DateRange }[] = [
  { label: "วันนี้", range: () => ({ from: toKey(today()), to: toKey(today()) }) },
  { label: "7 วันล่าสุด", range: () => ({ from: toKey(addDays(today(), -6)), to: toKey(today()) }) },
  { label: "30 วันล่าสุด", range: () => ({ from: toKey(addDays(today(), -29)), to: toKey(today()) }) },
  {
    label: "เดือนนี้",
    range: () => {
      const t = today();
      return { from: toKey(new Date(t.getFullYear(), t.getMonth(), 1)), to: toKey(t) };
    },
  },
];

export function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  // วันแรกที่คลิกไว้ ระหว่างรอคลิกวันสิ้นสุด
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [month, setMonth] = useState(() => startOfMonth(value.to ? fromKey(value.to) : today()));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setAnchor(null);
    setHover(null);
  }

  function toggle() {
    if (open) return close();
    setMonth(startOfMonth(value.to ? fromKey(value.to) : today()));
    setOpen(true);
  }

  function pick(key: string) {
    if (!anchor) {
      setAnchor(key);
      return;
    }
    onChange(anchor <= key ? { from: anchor, to: key } : { from: key, to: anchor });
    close();
  }

  function apply(range: DateRange) {
    onChange(range);
    close();
  }

  // ช่วงที่ไฮไลต์: ระหว่างเลือกใช้ anchor + วันที่เมาส์ชี้, ไม่งั้นใช้ค่าปัจจุบัน
  const [lo, hi] = anchor
    ? [anchor, hover ?? anchor].sort()
    : [value.from, value.to || value.from];
  const hasValue = !!(value.from || value.to);
  const todayKey = toKey(today());

  return (
    // จอเล็ก: popover อ้างตำแหน่งจากแถวตัวกรองด้านนอก (ต้องเป็น relative) เพื่อไม่ให้ล้นขอบจอ
    <div ref={rootRef} className="sm:relative">
      <div
        className={`flex items-center rounded-full text-sm ${
          hasValue ? "bg-indigo-600 text-white" : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
        }`}
      >
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={`flex items-center gap-1.5 py-1 ${hasValue ? "pl-3 pr-1" : "px-3"}`}
        >
          <CalendarDays className="h-4 w-4" />
          <span className="whitespace-nowrap">{hasValue ? formatRange(value) : "ช่วงวันที่"}</span>
        </button>
        {hasValue && (
          <button
            type="button"
            onClick={() => apply({ from: "", to: "" })}
            aria-label="ล้างช่วงวันที่"
            className="mr-1 rounded-full p-1 hover:bg-white/20"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="เลือกช่วงวันที่"
          className="absolute inset-x-0 z-20 mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:left-auto sm:right-0 sm:w-[19rem]"
        >
          <div className="mb-3 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => apply(p.range())}
                className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, -1))}
              aria-label="เดือนก่อนหน้า"
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-slate-800">{monthFormatter.format(month)}</span>
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              aria-label="เดือนถัดไป"
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-xs text-slate-400">
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5" onPointerLeave={() => setHover(null)}>
            {monthDays(month).map((date, i) => {
              if (!date) return <span key={i} />;
              const key = toKey(date);
              const isEdge = key === lo || key === hi;
              const inRange = !!lo && key > lo && key < hi;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => pick(key)}
                  onPointerEnter={() => anchor && setHover(key)}
                  className={`h-9 text-sm tabular-nums ${
                    isEdge
                      ? "rounded-md bg-indigo-600 font-medium text-white"
                      : inRange
                        ? "bg-indigo-50 text-indigo-700"
                        : `rounded-md hover:bg-slate-100 ${key === todayKey ? "font-semibold text-indigo-600" : "text-slate-700"}`
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <p className="mt-2 text-center text-xs text-slate-400">
            {anchor ? "เลือกวันสิ้นสุด" : "คลิกวันเริ่มต้น แล้วคลิกวันสิ้นสุด"}
          </p>
        </div>
      )}
    </div>
  );
}

function formatRange({ from, to }: DateRange) {
  if (!from || !to) return fullFormatter.format(fromKey(from || to));
  if (from === to) return fullFormatter.format(fromKey(from));
  const a = fromKey(from);
  const b = fromKey(to);
  const first = a.getFullYear() === b.getFullYear() ? shortFormatter.format(a) : fullFormatter.format(a);
  return `${first} – ${fullFormatter.format(b)}`;
}

// วันในเดือน เติม null ข้างหน้าให้วันที่ 1 ตรงกับคอลัมน์วันในสัปดาห์
function monthDays(month: Date): (Date | null)[] {
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days: (Date | null)[] = Array(month.getDay()).fill(null);
  for (let d = 1; d <= count; d++) days.push(new Date(month.getFullYear(), month.getMonth(), d));
  return days;
}

function today() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, n: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

function addMonths(date: Date, n: number) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

export function toKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// "2026-10-22" → 00:00 ของวันนั้นตามเวลาท้องถิ่น (new Date("YYYY-MM-DD") จะตีเป็น UTC)
export function fromKey(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}
