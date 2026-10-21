"use client";

import { useState } from "react";

// กราฟแท่งแนวตั้ง series เดียว (สีเดียว) พร้อม tooltip เมื่อ hover
const BAR_COLOR = "#2a78d6";
const BAR_HOVER = "#1c5cab";

const dayLabel = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });
const fullLabel = new Intl.DateTimeFormat("th-TH", { dateStyle: "full", timeZone: "Asia/Bangkok" });

function niceMax(value: number): number {
  if (value <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(value)));
  return Math.ceil(value / step) * step;
}

export function DailyColumnChart({ data, unit = "รายการ" }: { data: { date: string; count: number }[]; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((d) => d.count), 0));
  const ticks = [max, max / 2, 0];
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <figure>
      <div className="flex gap-3">
        {/* แกน Y */}
        <div className="flex h-48 flex-col justify-between pb-0 text-right text-xs tabular-nums text-slate-400">
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0">
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </span>
          ))}
        </div>

        <div className="relative flex-1">
          {/* เส้น grid */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48">
            {ticks.map((t, i) => (
              <div
                key={t}
                className={`absolute inset-x-0 border-t ${i === ticks.length - 1 ? "border-slate-300" : "border-slate-100"}`}
                style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
              />
            ))}
          </div>

          <div className="relative flex h-48 items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => {
              const height = max > 0 ? (d.count / max) * 100 : 0;
              const active = hover === i;
              return (
                <div
                  key={d.date}
                  className="relative flex h-full flex-1 cursor-default items-end justify-center"
                  onMouseEnter={() => setHover(i)}
                  role="img"
                  aria-label={`${fullLabel.format(new Date(`${d.date}T12:00:00+07:00`))}: ${d.count} ${unit}`}
                >
                  {active && <div className="absolute inset-0 rounded-md bg-slate-100/70" />}
                  {d.count > 0 && (
                    <div
                      className="relative w-full max-w-6 rounded-t-[4px] transition-colors"
                      style={{ height: `${height}%`, backgroundColor: active ? BAR_HOVER : BAR_COLOR }}
                    />
                  )}
                  {active && (
                    <div className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
                      <p className="text-slate-300">{fullLabel.format(new Date(`${d.date}T12:00:00+07:00`))}</p>
                      <p className="mt-0.5 font-semibold">
                        {d.count} {unit}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* แกน X: แสดงวันเว้นวัน กันตัวหนังสือชนกัน */}
          <div className="mt-2 flex gap-[2px] text-[11px] text-slate-400">
            {data.map((d, i) => (
              <span key={d.date} className="flex-1 truncate text-center">
                {i % 2 === (data.length - 1) % 2 ? dayLabel.format(new Date(`${d.date}T12:00:00+07:00`)) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
      <figcaption className="sr-only">
        รวม {total} {unit} ใน {data.length} วันที่ผ่านมา
      </figcaption>
    </figure>
  );
}
