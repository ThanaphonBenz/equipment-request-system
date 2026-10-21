// รูปแบบข้อมูลที่ API ส่งกลับไปให้ฝั่ง client (ใช้ id เป็น string แทน ObjectId)

export type Role = "admin" | "user";
export type EquipmentStatus = "available" | "unavailable";
export type RequisitionStatus = "pending" | "approved" | "rejected" | "returned" | "cancelled";

export interface UserDTO {
  id: string;
  username: string;
  fullname: string;
  role: Role;
}

export interface CategoryDTO {
  id: string;
  name: string;
  description: string;
  equipment_count: number;
}

export interface EquipmentDTO {
  id: string;
  category: { id: string; name: string } | null;
  item_code: string;
  name: string;
  total_qty: number;
  available_qty: number;
  status: EquipmentStatus;
  deleted_at: string | null;
  // จำนวนคำขอที่เคยอ้างถึงอุปกรณ์นี้ (ส่งให้ admin เท่านั้น ใช้ตัดสินว่าลบถาวรหรือเก็บเข้าคลัง)
  requisition_count?: number;
}

export type LogTargetType = "auth" | "requisition" | "equipment" | "category";
export type LogAction =
  | "auth.login"
  | "requisition.create"
  | "requisition.approve"
  | "requisition.reject"
  | "requisition.return"
  | "requisition.cancel"
  | "equipment.create"
  | "equipment.update"
  | "equipment.delete"
  | "equipment.archive"
  | "equipment.restore"
  | "category.create"
  | "category.update"
  | "category.delete";

export interface FieldChange {
  field: string;
  from: string | number;
  to: string | number;
}

export interface ActivityLogDTO {
  id: string;
  actor: { id: string; username: string; fullname: string };
  action: LogAction;
  target_type: LogTargetType;
  target_id: string | null;
  target_label: string;
  description: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface RequisitionDTO {
  id: string;
  request_no: string;
  user: { id: string; username: string; fullname: string } | null;
  equipment: { id: string; item_code: string; name: string } | null;
  quantity: number;
  reason: string;
  status: RequisitionStatus;
  admin_note: string;
  reviewed_by: { id: string; fullname: string } | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}
