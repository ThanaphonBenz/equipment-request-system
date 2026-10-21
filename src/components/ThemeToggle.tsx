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

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => false);

  function toggleTheme() {
    const nextDark = !getThemeSnapshot();
    document.documentElement.classList.toggle("dark", nextDark);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextDark ? "dark" : "light");
    } catch (error) {
      console.warn("ไม่สามารถบันทึกการตั้งค่าธีมได้", error);
    }
    window.dispatchEvent(new Event("theme-change"));
  }

  const Icon = dark ? Sun : Moon;
  const label = dark ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={dark}
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100"
    >
      <Icon className="h-4 w-4" />
      {dark ? "โหมดสว่าง" : "โหมดมืด"}
    </button>
  );
}
