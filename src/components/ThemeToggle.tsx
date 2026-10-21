"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "equipment-request-theme";

function subscribeToTheme(callback: () => void) {
  window.addEventListener("theme-change", callback);
  return () => window.removeEventListener("theme-change", callback);
}

function getThemeSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  try {
    window.localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
  } catch (error) {
    console.warn("ไม่สามารถบันทึกการตั้งค่าธีมได้", error);
  }
  window.dispatchEvent(new Event("theme-change"));
}

const OPTIONS = [
  { dark: false, label: "สว่าง", icon: Sun, activeIcon: "text-amber-500" },
  { dark: true, label: "มืด", icon: Moon, activeIcon: "text-indigo-500" },
] as const;

// สวิตช์เลือกธีมแบบสองช่อง: แถบพื้นหลังเลื่อนไปอยู่ใต้ตัวเลือกที่ใช้อยู่
export function ThemeToggle({ className = "" }: { className?: string }) {
  const dark = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => false);

  return (
    <div
      role="radiogroup"
      aria-label="ธีมการแสดงผล"
      className={`relative grid grid-cols-2 rounded-lg bg-slate-100 p-1 ring-1 ring-inset ring-slate-200 ${className}`}
    >
      <span
        aria-hidden
        className={`theme-toggle-thumb absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-md bg-white shadow-sm ring-1 ring-slate-200 transition-transform duration-200 ease-out motion-reduce:transition-none ${
          dark ? "translate-x-full" : ""
        }`}
      />
      {OPTIONS.map((o) => {
        const active = o.dark === dark;
        const Icon = o.icon;
        return (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => !active && applyTheme(o.dark)}
            className={`relative z-10 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              active ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className={`h-3.5 w-3.5 ${active ? o.activeIcon : ""}`} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
