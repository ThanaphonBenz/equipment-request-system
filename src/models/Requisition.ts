import { Schema, deleteModel, model, models, type Model, type Types } from "mongoose";
import type { RequisitionStatus } from "@/types";

export interface Requisition {
  // รายการที่ส่งมาพร้อมกันในคำขอเดียวจะมี request_no เดียวกัน
  request_no: string;
  user_id: Types.ObjectId;
  equipment_id: Types.ObjectId;
  quantity: number;
  reason: string;
  status: RequisitionStatus;
  // ผลการพิจารณาของ admin (ตอนอนุมัติ/ไม่อนุมัติ)
  admin_note: string;
  reviewed_by: Types.ObjectId | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const requisitionSchema = new Schema<Requisition>(
  {
    request_no: { type: String, required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    equipment_id: { type: Schema.Types.ObjectId, ref: "Equipment", required: true },
    quantity: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "returned", "cancelled"],
      default: "pending",
      required: true,
      index: true,
    },
    admin_note: { type: String, default: "", trim: true },
    reviewed_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewed_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

// ตอน dev ไฟล์ถูกโหลดใหม่เมื่อแก้โค้ด: ลบ model เดิมก่อน เพื่อให้ใช้ schema ล่าสุด
// (ถ้าใช้ models.Requisition ซ้ำ จะติด schema เก่าและ field ใหม่จะไม่ถูกบันทึก)
if (models.Requisition) deleteModel("Requisition");

export const RequisitionModel: Model<Requisition> = model<Requisition>("Requisition", requisitionSchema, "requisitions");
