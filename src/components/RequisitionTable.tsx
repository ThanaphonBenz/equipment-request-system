"use client";

import { ClipboardCheck, ClipboardX, MessageSquareText, Package, RotateCcw, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { ConfirmCard, useConfirm, type ConfirmOptions } from "@/components/ConfirmDialog";
import { DateRangePicker, fromKey, type DateRange } from "@/components/DateRangePicker";
import { StatusBadge } from "@/components/StatusBadge";
import { apiFetch } from "@/lib/api-client";
import { REJECT_NOTE_MIN } from "@/lib/validations";
import type { RequisitionDTO, RequisitionStatus } from "@/types";

type Mode = "mine" | "admin";
type Action = "approved" | "rejected" | "returned" | "cancelled";

const FILTERS: { value: RequisitionStatus | ""; label: string }[] = [
  { value: "", label: "ทั้งหมด" },
  { value: "pending", label: "รออนุมัติ" },
  { value: "approved", label: "อนุมัติแล้ว" },
  { value: "rejected", label: "ไม่อนุมัติ" },
  { value: "returned", label: "คืนแล้ว" },
  { value: "cancelled", label: "ยกเลิกแล้ว" },
];

const ACTION_LABEL: Record<Action, string> = {
  approved: "อนุมัติ",
  rejected: "ไม่อนุมัติ",
  returned: "บันทึกการคืน",
  cancelled: "ยกเลิก",
};

const ACTION_CONFIRM: Record<Action, { tone: ConfirmOptions["tone"]; icon: LucideIcon; message: string }> = {
  approved: {
    tone: "success",
    icon: ClipboardCheck,
    message: "ระบบจะตัดจำนวนคงเหลือของอุปกรณ์ทันทีหลังอนุมัติ",
  },
  rejected: {
    tone: "danger",
    icon: ClipboardX,
    message: "ผู้ขอจะเห็นสถานะ \"ไม่อนุมัติ\" และเปลี่ยนกลับไม่ได้",
  },
  returned: {
    tone: "primary",
    icon: RotateCcw,
    message: "ระบบจะคืนจำนวนอุปกรณ์เข้าสต็อก",
  },
  cancelled: {
    tone: "danger",
    icon: ClipboardX,
    message: "ยกเลิกได้เฉพาะคำขอที่รออนุมัติ และเมื่อยกเลิกแล้วจะเปลี่ยนกลับไม่ได้",
  },
};

const REJECT_SUGGESTIONS = [
  "จำนวนคงเหลือไม่เพียงพอ",
  "อุปกรณ์อยู่ระหว่างซ่อมบำรุง",
  "เหตุผลการเบิกไม่ชัดเจน กรุณาระบุเพิ่มเติม",
  "จำนวนที่ขอเกินความจำเป็น",
];

const dateFormatter = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" });

export function RequisitionTable({ mode, initialStatus = "" }: { mode: Mode; initialStatus?: RequisitionStatus | "" }) {
  const router = useRouter();
  const { ask, confirm, dialog } = useConfirm();
  const [status, setStatus] = useState<RequisitionStatus | "">(initialStatus);
  const [range, setRange] = useState<DateRange>({ from: "", to: "" });
  const [rows, setRows] = useState<RequisitionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (mode === "admin") params.set("scope", "all");
    if (status) params.set("status", status);
    // แปลงเป็นขอบวันตามเวลาท้องถิ่น: from = 00:00 ของวันเริ่ม, to = 00:00 ของวันถัดจากวันสิ้นสุด
    if (range.from) params.set("from", fromKey(range.from).toISOString());
    if (range.to) {
      const end = fromKey(range.to);
      end.setDate(end.getDate() + 1);
      params.set("to", end.toISOString());
    }

    let ignore = false;
    apiFetch<{ requisitions: RequisitionDTO[] }>(`/api/requisitions?${params}`)
      .then((data) => !ignore && setRows(data.requisitions))
      .catch((err: Error) => !ignore && setError(err.message))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [mode, status, range]);

  function changeFilter(value: RequisitionStatus | "") {
    if (value === status) return;
    setLoading(true);
    setError("");
    setStatus(value);
  }

  function changeRange(value: DateRange) {
    if (value.from === range.from && value.to === range.to) return;
    setLoading(true);
    setError("");
    setRange(value);
  }

  async function handleAction(row: RequisitionDTO, action: Action) {
    const name = row.equipment?.name ?? "อุปกรณ์";
    const meta = ACTION_CONFIRM[action];
    const options = {
      title: `${ACTION_LABEL[action]}คำขอเบิกนี้?`,
      message: meta.message,
      tone: meta.tone,
      icon: meta.icon,
      confirmLabel: ACTION_LABEL[action],
      content: (
        <ConfirmCard
          icon={Package}
          tone={meta.tone}
          title={name}
          subtitle={<span className="font-mono">{row.equipment?.item_code}</span>}
          badge={{ value: `×${row.quantity}`, label: "ชิ้น" }}
          meta={[
            { label: "ผู้ขอเบิก", value: row.user?.fullname ?? "-", avatar: true },
            { label: "เลขที่คำขอ", value: row.request_no, mono: true },
          ]}
          note={{ label: "เหตุผลการเบิก", text: row.reason }}
        />
      ),
    };

    // ไม่อนุมัติ: บังคับกรอกเหตุผล / อนุมัติ: หมายเหตุไม่บังคับ / คืน: ยืนยันอย่างเดียว
    let note = "";
    if (action === "returned" || action === "cancelled") {
      if (!(await confirm(options))) return;
    } else {
      const answer = await ask({
        ...options,
        input:
          action === "rejected"
            ? {
                label: "เหตุผลที่ไม่อนุมัติ (ผู้ขอจะเห็นข้อความนี้)",
                placeholder: "เช่น จำนวนคงเหลือไม่เพียงพอ กรุณาส่งคำขอใหม่สัปดาห์หน้า",
                minLength: REJECT_NOTE_MIN,
                requiredMessage: `กรุณาระบุเหตุผลที่ไม่อนุมัติ อย่างน้อย ${REJECT_NOTE_MIN} ตัวอักษร`,
                suggestions: REJECT_SUGGESTIONS,
              }
            : {
                label: "หมายเหตุถึงผู้ขอ",
                placeholder: "เช่น รับอุปกรณ์ได้ที่ห้องพัสดุ ชั้น 2 ตั้งแต่ 13:00 น.",
              },
      });
      if (answer === null) return;
      note = answer;
    }

    setBusyId(row.id);
    setNotice("");
    setError("");
    try {
      const { requisition } = await apiFetch<{ requisition: RequisitionDTO }>(`/api/requisitions/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: action, note }),
      });
      // ถ้ากำลังกรองสถานะอื่นอยู่ ให้เอาแถวออกจากตาราง
      setRows((prev) =>
        status && requisition.status !== status
          ? prev.filter((r) => r.id !== row.id)
          : prev.map((r) => (r.id === row.id ? requisition : r)),
      );
      setNotice(`${ACTION_LABEL[action]}คำขอเบิก ${name} เรียบร้อยแล้ว`);
      router.refresh(); // อัปเดตตัวเลขคำขอที่รออนุมัติใน sidebar
    } catch (err) {
      setError(err instanceof Error ? err.message : "ดำเนินการไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  }

  const isAdmin = mode === "admin";
  const groups = groupByRequest(rows);

  return (
    <div className="space-y-4">
      {dialog}
      <div className="relative flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => changeFilter(f.value)}
            className={`rounded-full px-3 py-1 text-sm ${
              status === f.value
                ? "bg-indigo-600 text-white"
                : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}

        <div className="sm:ml-auto">
          <DateRangePicker value={range} onChange={changeRange} />
        </div>
      </div>

      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>
      )}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {loading || groups.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500 shadow-sm">
          {loading ? "กำลังโหลด..." : "ไม่มีคำขอเบิก"}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.request_no} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="text-xs font-medium text-slate-500">เลขที่คำขอ</span>
                  <span className="font-mono text-sm font-semibold text-indigo-700">{g.request_no}</span>
                  <span className="text-xs text-slate-500">{dateFormatter.format(new Date(g.created_at))}</span>
                  {isAdmin && g.user && (
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                      {g.user.fullname}
                    </span>
                  )}
                  <span className="ml-auto rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                    {g.items.length} รายการ
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  <span className="font-medium text-slate-500">เหตุผลที่ขอ:</span> {g.reason}
                </p>
              </header>

              <div>
                {g.items.map((r, i) => {
                  const showNote = !!r.admin_note && r.status !== "pending";
                  return (
                    <div key={r.id} className={i > 0 ? "border-t border-slate-100" : ""}>
                      <div className="grid grid-cols-2 items-center gap-x-4 gap-y-4 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_100px_130px_180px]">
                        <div className="col-span-2 min-w-0 sm:col-span-1">
                          <p className="font-medium text-slate-900">{r.equipment?.name ?? "(ถูกลบ)"}</p>
                          <p className="mt-1 font-mono text-xs text-slate-400">{r.equipment?.item_code}</p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs text-slate-400 sm:hidden">จำนวน</p>
                          <span className="font-semibold tabular-nums text-slate-900">{r.quantity}</span>{" "}
                          <span className="text-xs text-slate-400">ชิ้น</span>
                        </div>
                        <div>
                          <p className="mb-1 text-xs text-slate-400 sm:hidden">สถานะ</p>
                          <StatusBadge status={r.status} />
                        </div>
                        <div className="col-span-2 flex justify-start sm:col-span-1 sm:justify-end">
                          {isAdmin ? (
                            <>
                              {r.status === "pending" && (
                                <div className="flex gap-2">
                                  <ActionButton tone="green" disabled={busyId === r.id} onClick={() => handleAction(r, "approved")}>
                                    อนุมัติ
                                  </ActionButton>
                                  <ActionButton tone="red" disabled={busyId === r.id} onClick={() => handleAction(r, "rejected")}>
                                    ไม่อนุมัติ
                                  </ActionButton>
                                </div>
                              )}
                              {r.status === "approved" && (
                                <ActionButton tone="indigo" disabled={busyId === r.id} onClick={() => handleAction(r, "returned")}>
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  บันทึกการคืน
                                </ActionButton>
                              )}
                              {(r.status === "rejected" || r.status === "returned" || r.status === "cancelled") && (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </>
                          ) : r.status === "pending" ? (
                            <ActionButton
                              tone="red"
                              disabled={busyId === r.id}
                              onClick={() => handleAction(r, "cancelled")}
                            >
                              ยกเลิก
                            </ActionButton>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </div>
                      {showNote && (
                        <div className="px-5 pb-4">
                          <ReviewNote requisition={r} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

// รวมรายการที่ส่งมาพร้อมกัน (request_no เดียวกัน) โดยคงลำดับเดิมไว้
function groupByRequest(rows: RequisitionDTO[]) {
  type Group = {
    request_no: string;
    created_at: string;
    reason: string;
    user: RequisitionDTO["user"];
    items: RequisitionDTO[];
  };
  const map = new Map<string, Group>();
  for (const r of rows) {
    const group = map.get(r.request_no);
    if (group) group.items.push(r);
    else map.set(r.request_no, { request_no: r.request_no, created_at: r.created_at, reason: r.reason, user: r.user, items: [r] });
  }
  return [...map.values()];
}

const TONES = {
  green: "bg-emerald-600 text-white hover:bg-emerald-700",
  red: "bg-rose-600 text-white hover:bg-rose-700",
  indigo: "bg-indigo-600 text-white hover:bg-indigo-700",
};

function ActionButton({
  tone,
  disabled,
  onClick,
  children,
}: {
  tone: keyof typeof TONES;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium disabled:opacity-50 ${TONES[tone]}`}
    >
      {children}
    </button>
  );
}

// หมายเหตุจากผู้พิจารณา: แถบเต็มความกว้างใต้รายการ
function ReviewNote({ requisition: r }: { requisition: RequisitionDTO }) {
  const rejected = r.status === "rejected";
  return (
    <div
      className={`flex flex-wrap items-start gap-x-3 gap-y-1 rounded-lg border-l-4 px-3 py-2 text-sm ${
        rejected ? "border-rose-400 bg-rose-50 text-rose-900" : "border-slate-300 bg-slate-50 text-slate-700"
      }`}
    >
      <MessageSquareText className={`mt-0.5 h-4 w-4 shrink-0 ${rejected ? "text-rose-500" : "text-slate-400"}`} />
      <p className="min-w-0 flex-1 break-words">
        <span className="font-medium">{rejected ? "เหตุผลที่ไม่อนุมัติ:" : "หมายเหตุจากผู้ดูแล:"}</span>{" "}
        {r.admin_note}
      </p>
      {r.reviewed_by && (
        <p className={`whitespace-nowrap text-xs leading-5 ${rejected ? "text-rose-500" : "text-slate-400"}`}>
          โดย {r.reviewed_by.fullname}
          {r.reviewed_at && ` · ${dateFormatter.format(new Date(r.reviewed_at))}`}
        </p>
      )}
    </div>
  );
}
