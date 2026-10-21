import { Schema, deleteModel, model, models, type Model } from "mongoose";
import type { Role } from "@/types";

export interface User {
  username: string;
  fullname: string;
  role: Role;
  created_at: Date;
  updated_at: Date;
}

const userSchema = new Schema<User>(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    fullname: { type: String, required: true, trim: true },
    role: { type: String, enum: ["admin", "user"], default: "user", required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

// ตอน dev ไฟล์ถูกโหลดใหม่เมื่อแก้โค้ด: ลบ model เดิมก่อน เพื่อให้ใช้ schema ล่าสุด
// (ถ้าใช้ models.User ซ้ำ จะติด schema เก่าและ field ใหม่จะไม่ถูกบันทึก)
if (models.User) deleteModel("User");

export const UserModel: Model<User> = model<User>("User", userSchema, "users");
