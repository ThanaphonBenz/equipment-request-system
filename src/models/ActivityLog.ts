import { Schema, deleteModel, model, models, type Model, type Types } from "mongoose";
import type { LogAction, LogTargetType } from "@/types";

// บันทึกการใช้งาน (audit log): เขียนอย่างเดียว ไม่มีการแก้ไขภายหลัง
// เก็บชื่อผู้ทำและชื่อเป้าหมายแบบ snapshot ไว้ด้วย เพื่อให้อ่านได้แม้ข้อมูลต้นทางถูกลบหรือแก้ไปแล้ว
export interface ActivityLog {
  actor_id: Types.ObjectId;
  actor_username: string;
  actor_fullname: string;
  action: LogAction;
  target_type: LogTargetType;
  target_id?: Types.ObjectId;
  target_label: string;
  description: string;
  details?: Record<string, unknown>;
  created_at: Date;
}

const activityLogSchema = new Schema<ActivityLog>(
  {
    actor_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actor_username: { type: String, required: true },
    actor_fullname: { type: String, required: true },
    action: {
      type: String,
      required: true,
      enum: [
        "auth.login",
        "requisition.create",
        "requisition.approve",
        "requisition.reject",
        "requisition.return",
        "requisition.cancel",
        "equipment.create",
        "equipment.update",
        "equipment.delete",
        "equipment.archive",
        "equipment.restore",
        "category.create",
        "category.update",
        "category.delete",
      ],
    },
    target_type: { type: String, required: true, enum: ["auth", "requisition", "equipment", "category"], index: true },
    target_id: { type: Schema.Types.ObjectId },
    target_label: { type: String, required: true },
    description: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

activityLogSchema.index({ created_at: -1 });

// ตอน dev ไฟล์ถูกโหลดใหม่เมื่อแก้โค้ด: ลบ model เดิมก่อน เพื่อให้ใช้ schema ล่าสุด
if (models.ActivityLog) deleteModel("ActivityLog");

export const ActivityLogModel: Model<ActivityLog> = model<ActivityLog>(
  "ActivityLog",
  activityLogSchema,
  "activity_logs",
);
