import type { EquipmentDTO } from "@/types";

export const NO_CATEGORY = "__none__";

// หมวดหมู่ที่มีอุปกรณ์อยู่ในรายการ (เรียงตามชื่อ) ใช้ทำตัวกรอง
export function categoriesOf(equipments: EquipmentDTO[]): { id: string; name: string }[] {
  const map = new Map<string, string>();
  for (const e of equipments) if (e.category) map.set(e.category.id, e.category.name);
  return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "th"));
}

export function matchesCategory(e: EquipmentDTO, filter: string): boolean {
  if (!filter) return true;
  return filter === NO_CATEGORY ? !e.category : e.category?.id === filter;
}
