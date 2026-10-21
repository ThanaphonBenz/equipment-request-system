"use client";

import {
  BellRing,
  Camera,
  CircleCheck,
  ClipboardPlus,
  Headphones,
  Laptop,
  Layers,
  Mic,
  Monitor,
  Mouse,
  PackageCheck,
  Projector,
  RotateCcw,
  Tablet,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";

// ไอคอนอุปกรณ์บนวงโคจร: angle = ตำแหน่งเริ่มต้น (องศา)
const OUTER: { icon: LucideIcon; angle: number }[] = [
  { icon: Tablet, angle: 200 },
  { icon: Camera, angle: 250 },
  { icon: Projector, angle: 315 },
  { icon: Laptop, angle: 20 },
  { icon: Monitor, angle: 100 },
];
const INNER: { icon: LucideIcon; angle: number }[] = [
  { icon: Headphones, angle: 160 },
  { icon: Mouse, angle: 265 },
  { icon: Laptop, angle: 15 },
  { icon: Mic, angle: 95 },
];

// ข้อความแจ้งเตือนตัวอย่างที่สลับไปเรื่อยๆ
const TOASTS: {
  icon: LucideIcon;
  title: string;
  detail: string;
  tone: string;
}[] = [
  {
    icon: CircleCheck,
    title: "อนุมัติคำขอแล้ว",
    detail: "โน้ตบุ๊ก Dell Latitude · 2 ชิ้น",
    tone: "bg-emerald-400 text-emerald-950",
  },
  {
    icon: ClipboardPlus,
    title: "มีคำขอเบิกใหม่",
    detail: "โปรเจกเตอร์ Epson · 1 ชิ้น",
    tone: "bg-amber-300 text-amber-950",
  },
  {
    icon: RotateCcw,
    title: "บันทึกการคืนแล้ว",
    detail: "ไมโครโฟนไร้สาย · 2 ชิ้น",
    tone: "bg-sky-300 text-sky-950",
  },
];

const FEATURES: { icon: LucideIcon; title: string; detail: string }[] = [
  {
    icon: Layers,
    title: "เบิกได้หลายรายการ",
    detail: "เลือกอุปกรณ์หลายชิ้นในคำขอเดียว",
  },
  {
    icon: PackageCheck,
    title: "ตัดสต็อกอัตโนมัติ",
    detail: "อนุมัติแล้วจำนวนคงเหลืออัปเดตทันที",
  },
  {
    icon: BellRing,
    title: "ติดตามได้ทุกขั้นตอน",
    detail: "เห็นสถานะ หมายเหตุ และประวัติย้อนหลัง",
  },
];

// กราฟแท่งเล็กในการ์ด "คำขอวันนี้" (ตัวเลขตัวอย่าง)
const BARS = [40, 65, 45, 80, 55, 90, 70];

// ขนาดที่ออกแบบไว้ของฝั่งซ้าย: จอที่เล็กกว่านี้จะย่อทั้งภาพลงตามสัดส่วน (ไม่ซ่อนชิ้นไหน)
const DESIGN_WIDTH = 1000;
const DESIGN_HEIGHT = 1080;

function Orbit({
  items,
  size,
  duration,
  reverse = false,
}: {
  items: { icon: LucideIcon; angle: number }[];
  size: number;
  duration: number;
  reverse?: boolean;
}) {
  const radius = size / 2;
  return (
    <div
      className="login-orbit absolute left-1/2 top-1/2 rounded-full border border-white/15"
      style={{
        width: size,
        height: size,
        marginLeft: -radius,
        marginTop: -radius,
        animationDuration: `${duration}s`,
        animationDirection: reverse ? "reverse" : "normal",
      }}
    >
      {items.map(({ icon: Icon, angle }, i) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: radius + radius * Math.cos(rad) - 24,
              top: radius + radius * Math.sin(rad) - 24,
            }}
          >
            {/* หมุนสวนทางกับวง เพื่อให้ไอคอนตั้งตรงตลอด */}
            <div
              className="login-orbit flex h-12 w-12 items-center justify-center rounded-2xl border border-white/25 bg-white/15 text-white shadow-lg shadow-indigo-950/20 backdrop-blur-sm"
              style={{
                animationDuration: `${duration}s`,
                animationDirection: reverse ? "normal" : "reverse",
              }}
            >
              <Icon className="h-5 w-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LoginHero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // ผู้ใช้ที่ตั้งค่าลดการเคลื่อนไหว: ไม่ต้องสลับข้อความ
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % TOASTS.length),
      3500,
    );
    return () => clearInterval(timer);
  }, []);

  // ย่อเนื้อหาด้วย zoom ให้พอดีพื้นที่จริง: กว้าง/สูงเสมือน = พื้นที่จริง ÷ zoom (ไม่ต่ำกว่าขนาดที่ออกแบบไว้)
  const heroRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{
    width: number;
    height: number;
    zoom: number;
  } | null>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;
      const zoom = Math.min(1, width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
      setFit({ width: width / zoom, height: height / zoom, zoom });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const toast = TOASTS[index];
  const ToastIcon = toast.icon;

  return (
    <div
      ref={heroRef}
      aria-hidden
      className="relative hidden overflow-hidden text-white lg:block"
      style={{
        background:
          "linear-gradient(155deg, #7c3aed 0%, #5b4ff0 40%, #4f46e5 70%, #4338ca 100%)",
      }}
    >
      {/* ลายจุดจางๆ + แสงฟุ้ง + ไล่มืดด้านล่างให้ตัวหนังสืออ่านชัด */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-fuchsia-400/25 blur-3xl" />
      <div className="pointer-events-none absolute right-[-6rem] top-1/3 h-80 w-80 rounded-full bg-indigo-300/20 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background:
            "linear-gradient(to top, rgba(30, 27, 75, 0.5), transparent)",
        }}
      />

      <div
        className={`absolute left-0 top-0 flex flex-col ${fit ? "" : "inset-0 invisible"}`}
        style={
          fit
            ? { width: fit.width, height: fit.height, zoom: fit.zoom }
            : undefined
        }
      >
        {/* 1) แบรนด์ */}
        <div className="relative z-10 flex items-center gap-3 px-16 pt-10">
          <Logo className="h-14 w-14 drop-shadow-lg" />
          <div className="leading-tight">
            <p className="text-xl font-bold">ระบบเบิกจ่ายอุปกรณ์</p>
            <p className="text-base text-white/80">Equipment Request System</p>
          </div>
        </div>

        {/* 2) ป้ายสถานะ + วงโคจร + แจ้งเตือนที่มุมขวาล่างของวง */}
        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-16">
          <span className="absolute left-16 top-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-base font-medium backdrop-blur-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="login-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300" />
            </span>
            ระบบพร้อมใช้งาน
          </span>

          {/* การ์ด "คำขอวันนี้" มุมซ้ายบน (ทแยงกับแจ้งเตือนขวาล่าง) */}
          <div className="absolute left-16 top-[5.5rem]">
            <div className="login-float-delayed w-52 rounded-2xl border border-white/20 bg-white/[0.12] p-4 shadow-xl shadow-indigo-950/30 backdrop-blur-md">
              <div className="flex items-center justify-between text-sm text-white/85">
                คำขอวันนี้
                {/* ใช้ค่าสีตรงๆ เพราะโหมดมืดเปลี่ยน emerald-100 เป็นสีเข้ม (ฝั่งนี้พื้นม่วงเหมือนเดิมทั้งสองโหมด) */}
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-400/25 px-2 py-0.5 text-xs font-semibold text-[#d1fae5]">
                  <TrendingUp className="h-3.5 w-3.5" />
                  18%
                </span>
              </div>
              <p className="mt-1 text-3xl font-bold">
                12{" "}
                <span className="text-base font-medium text-white/80">
                  รายการ
                </span>
              </p>
              <div className="mt-3 flex h-12 items-end gap-1.5">
                {BARS.map((h, i) => (
                  <span
                    key={i}
                    // bg-[#ffffff] แทน bg-white เพราะโหมดมืดเปลี่ยน bg-white เป็นสีเข้มทั้งหน้า
                    className={`flex-1 rounded-t-[3px] ${i === BARS.length - 2 ? "bg-[#ffffff]" : "bg-white/35"}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="relative">
            {/* p-4: เผื่อที่ให้ไอคอนที่ยื่นออกนอกเส้นวง ไม่ให้ชนสิ่งรอบข้าง */}
            <div className="login-orbit-wrap p-4">
              <div className="relative h-[26rem] w-[26rem]">
                <Orbit items={OUTER} size={400} duration={60} />
                <Orbit items={INNER} size={240} duration={40} reverse />
                {/* โลโก้ตรงกลาง: กรอบกระจกขาวรอบโลโก้ให้เด่นจากพื้นม่วง */}
                <div className="absolute left-1/2 top-1/2 -ml-[4.25rem] -mt-[4.25rem] rounded-[2.1rem] border border-white/40 bg-white/25 p-2 shadow-2xl shadow-indigo-950/50 backdrop-blur-md">
                  <Logo className="h-28 w-28" />
                </div>
              </div>
            </div>

            {/* แจ้งเตือน: เกาะมุมขวาล่าง อยู่ใต้กรอบวงโคจร จึงไม่ทับไอคอนที่หมุน */}
            <div className="login-float absolute left-1/2 top-full mt-3 ml-8">
              <div
                key={index}
                className="login-toast flex w-[22rem] items-center gap-3.5 rounded-2xl border border-white/25 bg-white/[0.14] px-4 py-3 shadow-xl shadow-indigo-950/30 backdrop-blur-md"
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${toast.tone}`}
                >
                  <ToastIcon className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-semibold">{toast.title}</p>
                  <p className="truncate text-sm text-white/85">
                    {toast.detail}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3) หัวข้อใหญ่ (ซ้าย) + จุดเด่น (ขวา) */}
        <div className="relative z-10 grid grid-cols-[minmax(0,1fr)_22rem] items-stretch gap-10 px-16 pb-12 pt-14">
          {/* ยืดให้สูงเท่าคอลัมน์จุดเด่น: หัวข้อชิดบน คำอธิบายชิดล่าง ขอบบน-ล่างจะได้ตรงกัน */}
          <div className="flex flex-col justify-between">
            {/* แต่ละบรรทัดไม่ตัดคำ (จะได้ 2 บรรทัดเสมอ) */}
            <h2 className="text-[3rem] font-bold leading-tight tracking-tight [text-shadow:0_2px_12px_rgba(30,27,75,0.35)]">
              <span className="block whitespace-nowrap">
                จัดการเบิกจ่ายอุปกรณ์
              </span>
              <span className="block whitespace-nowrap">
                ขององค์กรได้ในที่เดียว
              </span>
            </h2>
            <p className="mt-3 whitespace-nowrap text-lg leading-relaxed text-white/85">
              เชื่อมผู้ขอเบิกกับผู้ดูแลระบบ ตั้งแต่ส่งคำขอ อนุมัติ
              จนถึงคืนอุปกรณ์
            </p>
          </div>
          <ul className="space-y-2.5">
            {FEATURES.map(({ icon: Icon, title, detail }) => (
              <li
                key={title}
                className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-semibold">{title}</p>
                  <p className="text-sm text-white/80">{detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
