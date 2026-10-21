"use client";

import { AlertTriangle, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Tone = "primary" | "success" | "danger";

export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  // เนื้อหาสรุปให้ตรวจก่อนยืนยัน (มักใช้ <ConfirmCard />)
  content?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  icon?: LucideIcon;
  // ช่องกรอกข้อความ (เช่น หมายเหตุถึงผู้ขอ) ใช้กับ ask()
  input?: {
    label: string;
    placeholder?: string;
    minLength?: number; // 0 = ไม่บังคับ
    maxLength?: number;
    requiredMessage?: string;
    suggestions?: string[];
  };
}

type Result = { ok: boolean; value: string };

const TONES: Record<Tone, { icon: string; button: string; soft: string; badge: string }> = {
  primary: {
    icon: "bg-indigo-100 text-indigo-600",
    button: "bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-300",
    soft: "bg-indigo-50 text-indigo-600",
    badge: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  },
  success: {
    icon: "bg-emerald-100 text-emerald-600",
    button: "bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-300",
    soft: "bg-emerald-50 text-emerald-600",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  danger: {
    icon: "bg-rose-100 text-rose-600",
    button: "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-300",
    soft: "bg-rose-50 text-rose-600",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
  },
};

// ใช้แทน window.confirm:
//   const ok = await confirm({ title: "..." })               → true / false
//   const note = await ask({ title: "...", input: {...} })    → ข้อความ หรือ null ถ้ายกเลิก
export function useConfirm() {
  const [request, setRequest] = useState<(ConfirmOptions & { resolve: (r: Result) => void }) | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setRequest({ ...options, resolve: (r) => resolve(r.ok) })),
    [],
  );

  const ask = useCallback(
    (options: ConfirmOptions & { input: NonNullable<ConfirmOptions["input"]> }) =>
      new Promise<string | null>((resolve) =>
        setRequest({ ...options, resolve: (r) => resolve(r.ok ? r.value : null) }),
      ),
    [],
  );

  const settle = useCallback(
    (result: Result) => {
      request?.resolve(result);
      setRequest(null);
    },
    [request],
  );

  const dialog = request ? <ConfirmDialog {...request} onSettle={settle} /> : null;
  return { confirm, ask, dialog };
}

function ConfirmDialog({
  title,
  message,
  content,
  confirmLabel = "ยืนยัน",
  cancelLabel = "ยกเลิก",
  tone = "primary",
  icon: Icon = AlertTriangle,
  input,
  onSettle,
}: ConfirmOptions & { onSettle: (result: Result) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const style = TONES[tone];
  const [value, setValue] = useState("");
  const [inputError, setInputError] = useState("");
  const minLength = input?.minLength ?? 0;
  const maxLength = input?.maxLength ?? 300;

  const cancel = () => onSettle({ ok: false, value: "" });

  function submit() {
    const text = value.trim();
    if (input && text.length < minLength) {
      setInputError(input.requiredMessage ?? `กรุณากรอกอย่างน้อย ${minLength} ตัวอักษร`);
      textareaRef.current?.focus();
      return;
    }
    onSettle({ ok: true, value: text });
  }

  // showModal() จะย้ายโฟกัสไปที่ปุ่มแรกเสมอ (autoFocus ของ React ทำงานก่อนจึงถูกทับ) จึงต้องสั่งโฟกัสเองหลังเปิด:
  // มีช่องกรอก → ช่องกรอก, งานอันตราย (ลบ/ไม่อนุมัติ) → ปุ่มยกเลิก กันกด Enter พลาด, อื่นๆ → ปุ่มยืนยัน
  useEffect(() => {
    ref.current?.showModal();
    const target = input ? textareaRef.current : tone === "danger" ? cancelRef.current : confirmRef.current;
    target?.focus();
    // เปิดครั้งเดียวตอน mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <dialog
      ref={ref}
      // กด Esc = ยกเลิก
      onCancel={(e) => {
        e.preventDefault();
        cancel();
      }}
      // คลิกพื้นหลัง = ยกเลิก
      onClick={(e) => e.target === ref.current && cancel()}
      aria-labelledby="confirm-title"
      className="dialog-pop m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-[2px]"
    >
      <div className="p-6">
        <div className="flex gap-4">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${style.icon}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1 pt-1">
            <h2 id="confirm-title" className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            {message && <div className="mt-1 text-sm text-slate-600">{message}</div>}
          </div>
        </div>

        {content && <div className="mt-5">{content}</div>}

        {input && (
          <div className="mt-5">
            <label htmlFor="confirm-input" className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-slate-700">
              <span>
                {input.label} {minLength > 0 ? <span className="text-rose-500">*</span> : <span className="font-normal text-slate-400">(ไม่บังคับ)</span>}
              </span>
              <span className="text-xs font-normal text-slate-400">
                {value.length}/{maxLength}
              </span>
            </label>
            {input.suggestions && input.suggestions.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {input.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setValue(s);
                      setInputError("");
                      textareaRef.current?.focus();
                    }}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${
                      value === s
                        ? "border-slate-800 bg-slate-800 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <textarea
              id="confirm-input"
              ref={textareaRef}
              rows={3}
              maxLength={maxLength}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (inputError) setInputError("");
              }}
              placeholder={input.placeholder}
              aria-invalid={!!inputError}
              className={`w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                inputError
                  ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                  : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-200"
              }`}
            />
            {inputError && <p className="mt-1 text-sm text-rose-600">{inputError}</p>}
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          ref={cancelRef}
          onClick={cancel}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          ref={confirmRef}
          onClick={submit}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 ${style.button}`}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

// การ์ดสรุปสิ่งที่จะถูกกระทำ: หัวข้อหลัก + ป้ายตัวเลขด้านขวา + ข้อมูลประกอบด้านล่าง
export function ConfirmCard({
  icon: Icon,
  tone = "primary",
  title,
  subtitle,
  badge,
  meta,
  note,
}: {
  icon: LucideIcon;
  tone?: Tone;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: { value: React.ReactNode; label?: string };
  meta?: { label: string; value: string; avatar?: boolean; mono?: boolean }[];
  note?: { label: string; text: string };
}) {
  const style = TONES[tone];
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 p-4">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${style.soft}`}>
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-slate-900">{title}</p>
          {subtitle && <div className="truncate text-xs text-slate-500">{subtitle}</div>}
        </div>
        {badge && (
          <div className={`shrink-0 rounded-xl px-3 py-1.5 text-center ring-1 ring-inset ${style.badge}`}>
            <p className="text-lg font-bold leading-tight">{badge.value}</p>
            {badge.label && <p className="text-[11px] leading-tight opacity-80">{badge.label}</p>}
          </div>
        )}
      </div>

      {meta && meta.length > 0 && (
        <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/60">
          {meta.map((m) => (
            <div key={m.label} className="flex min-w-0 items-center gap-2.5 px-4 py-3">
              {m.avatar && (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                  {m.value.trim().charAt(0)}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-[11px] tracking-wide text-slate-400">{m.label}</p>
                <p className={`truncate text-sm font-medium text-slate-800 ${m.mono ? "font-mono text-xs" : ""}`}>
                  {m.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {note && note.text && (
        <div className="border-t border-slate-100 px-4 py-3">
          <p className="text-[11px] tracking-wide text-slate-400">{note.label}</p>
          <p className="mt-0.5 line-clamp-3 text-sm text-slate-600">{note.text}</p>
        </div>
      )}
    </div>
  );
}
