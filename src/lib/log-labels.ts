// ชื่อภาษาไทยของ action และ field ที่ใช้ทั้งตอนสร้างข้อความ log และตอนแสดงผล
import type { LogAction } from "@/types";

export const ACTION_LABELS: Record<LogAction, string> = {
  "auth.login": "เข้าสู่ระบบ",
  "requisition.create": "ส่งคำขอเบิก",
  "requisition.approve": "อนุมัติคำขอ",
  "requisition.reject": "ไม่อนุมัติคำขอ",
  "requisition.return": "บันทึกการคืน",
  "requisition.cancel": "ยกเลิกคำขอ",
  "equipment.create": "เพิ่มอุปกรณ์",
  "equipment.update": "แก้ไขอุปกรณ์",
  "equipment.delete": "ลบอุปกรณ์ถาวร",
  "equipment.archive": "เก็บอุปกรณ์เข้าคลัง",
  "equipment.restore": "กู้คืนอุปกรณ์",
  "category.create": "เพิ่มหมวดหมู่",
  "category.update": "แก้ไขหมวดหมู่",
  "category.delete": "ลบหมวดหมู่",
};

export const FIELD_LABELS: Record<string, string> = {
  item_code: "รหัส",
  name: "ชื่อ",
  total_qty: "จำนวนทั้งหมด",
  available_qty: "คงเหลือ",
  status: "สถานะ",
  category: "หมวดหมู่",
  description: "คำอธิบาย",
};

const VALUE_LABELS: Record<string, string> = {
  available: "แสดง",
  unavailable: "ซ่อน",
};

export function formatFieldValue(value: string | number): string {
  return typeof value === "string" ? (VALUE_LABELS[value] ?? value) : String(value);
}
