import type { EquipmentDTO, EquipmentStatus, RequisitionStatus } from "@/types";

const STYLES: Record<RequisitionStatus | EquipmentStatus, { label: string; className: string }> = {
  pending: { label: "รออนุมัติ", className: "bg-amber-100 text-amber-800" },
  approved: { label: "อนุมัติแล้ว", className: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "ไม่อนุมัติ", className: "bg-rose-100 text-rose-800" },
  returned: { label: "คืนแล้ว", className: "bg-slate-200 text-slate-700" },
  cancelled: { label: "ยกเลิกแล้ว", className: "bg-slate-100 text-slate-600" },
  available: { label: "แสดงให้เบิก", className: "bg-emerald-100 text-emerald-800" },
  unavailable: { label: "ซ่อนอยู่", className: "bg-slate-200 text-slate-600" },
};

export function StatusBadge({ status }: { status: RequisitionStatus | EquipmentStatus }) {
  const style = STYLES[status];
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${style.className}`}>
      {style.label}
    </span>
  );
}

export const LOW_STOCK_RATIO = 0.3;

// สถานะที่ผู้ใช้เห็น: ดูทั้งการซ่อนและจำนวนคงเหลือ
export function stockState(e: EquipmentDTO): "hidden" | "out" | "low" | "ready" {
  if (e.status === "unavailable") return "hidden";
  if (e.available_qty <= 0) return "out";
  if (e.total_qty > 0 && e.available_qty <= e.total_qty * LOW_STOCK_RATIO) return "low";
  return "ready";
}

const STOCK_STYLES: Record<ReturnType<typeof stockState>, { label: string; className: string; dot: string }> = {
  ready: { label: "พร้อมให้เบิก", className: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  low: { label: "ใกล้หมด", className: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  out: { label: "หมด", className: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
  hidden: { label: "ซ่อนอยู่", className: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" },
};

export function EquipmentStatusBadge({ equipment }: { equipment: EquipmentDTO }) {
  const style = STOCK_STYLES[stockState(equipment)];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}
