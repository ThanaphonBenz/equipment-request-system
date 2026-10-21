import { Schema, deleteModel, model, models, type Model, type Types } from "mongoose";
import type { EquipmentStatus } from "@/types";

export interface Equipment {
  category_id: Types.ObjectId | null;
  item_code: string;
  name: string;
  total_qty: number;
  available_qty: number;
  status: EquipmentStatus;
  // เก็บเข้าคลัง (soft delete): ไม่ใช้งานแล้วแต่เก็บไว้เพื่อประวัติการเบิก
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const equipmentSchema = new Schema<Equipment>(
  {
    category_id: { type: Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    item_code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    total_qty: { type: Number, required: true, min: 0 },
    available_qty: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["available", "unavailable"], default: "available", required: true },
    deleted_at: { type: Date, default: null, index: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

equipmentSchema.pre("validate", function () {
  if (this.available_qty > this.total_qty) {
    this.invalidate("available_qty", "available_qty ต้องไม่เกิน total_qty");
  }
});

// ตอน dev ไฟล์ถูกโหลดใหม่เมื่อแก้โค้ด: ลบ model เดิมก่อน เพื่อให้ใช้ schema ล่าสุด
// (ถ้าใช้ models.Equipment ซ้ำ จะติด schema เก่าและ field ใหม่จะไม่ถูกบันทึก)
if (models.Equipment) deleteModel("Equipment");

export const EquipmentModel: Model<Equipment> = model<Equipment>("Equipment", equipmentSchema, "equipments");
