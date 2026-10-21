"use client";

import { useId } from "react";

// โลโก้ระบบ: กล่องอุปกรณ์สามมิติบนพื้นไล่สีม่วงคราม + ตราเครื่องหมายถูก (อนุมัติแล้ว)
// ใช้ useId ให้ gradient แต่ละชิ้นมี id ไม่ซ้ำ (ถ้า id ซ้ำแล้วตัวแรกถูกซ่อน ตัวอื่นจะหาสีไม่เจอ)
export function Logo({ className = "h-9 w-9", title }: { className?: string; title?: string }) {
  const id = useId().replace(/:/g, "");
  const bg = `logo-bg-${id}`;
  return (
    <svg viewBox="0 0 64 64" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${bg})`} />
      {/* กล่อง: ฝาบน / ด้านซ้าย / ด้านขวา (ความทึบต่างกันให้ดูเป็นสามมิติ) */}
      <path d="M31 12 47 20 31 28 15 20Z" fill="#fff" />
      <path d="M15 20 31 28V48L15 40Z" fill="#fff" fillOpacity="0.7" />
      <path d="M47 20 31 28V48L47 40Z" fill="#fff" fillOpacity="0.88" />
      {/* เทปปิดกล่อง */}
      <path d="M23 16 39 24" stroke="#c4b5fd" strokeWidth="3.5" strokeLinecap="round" />
      {/* ตราอนุมัติ */}
      <circle cx="47" cy="45" r="10" fill="#fbbf24" stroke={`url(#${bg})`} strokeWidth="3" />
      <path d="M42.5 45.2 45.7 48.3 51.6 42" fill="none" stroke="#3b0764" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
