import { Schema, deleteModel, model, models, type Model } from "mongoose";

export interface Category {
  name: string;
  description: string;
  created_at: Date;
  updated_at: Date;
}

const categorySchema = new Schema<Category>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "", trim: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

// ตอน dev ไฟล์ถูกโหลดใหม่เมื่อแก้โค้ด: ลบ model เดิมก่อน เพื่อให้ใช้ schema ล่าสุด
if (models.Category) deleteModel("Category");

export const CategoryModel: Model<Category> = model<Category>("Category", categorySchema, "categories");
