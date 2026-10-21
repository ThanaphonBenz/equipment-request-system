/**
 * ใส่ข้อมูลตัวอย่างลง MongoDB (ลบข้อมูลเดิมทุก collection ก่อน)
 * รัน: npm run seed
 */
import mongoose, { type Types } from "mongoose";
import { ActivityLogModel } from "../src/models/ActivityLog";
import { CategoryModel } from "../src/models/Category";
import { EquipmentModel } from "../src/models/Equipment";
import { RequisitionModel } from "../src/models/Requisition";
import { UserModel } from "../src/models/User";

process.loadEnvFile(".env.local");

// ---------- ข้อมูลตั้งต้น ----------

const USERS = [
  { username: "admin", fullname: "ผู้ดูแลระบบ", role: "admin" },
  { username: "somchai", fullname: "สมชาย ใจดี", role: "user" },
  { username: "somying", fullname: "สมหญิง รักงาน", role: "user" },
  { username: "wichai", fullname: "วิชัย ขยันยิ่ง", role: "user" },
] as const;

const CATEGORIES = {
  computer: { name: "คอมพิวเตอร์และอุปกรณ์ต่อพ่วง", description: "โน้ตบุ๊ก แท็บเล็ต จอภาพ เมาส์ และคีย์บอร์ด" },
  presentation: { name: "อุปกรณ์นำเสนอ", description: "โปรเจกเตอร์ จอรับภาพ และอุปกรณ์สำหรับการประชุม" },
  audioVisual: { name: "อุปกรณ์ภาพและเสียง", description: "กล้อง ไมโครโฟน ลำโพง และขาตั้ง" },
  office: { name: "เครื่องใช้สำนักงาน", description: "เครื่องพิมพ์ เครื่องสแกน และเครื่องใช้สำนักงานอื่นๆ" },
  accessory: { name: "สายสัญญาณและอุปกรณ์เสริม", description: "สายเชื่อมต่อ ปลั๊กพ่วง อะแดปเตอร์ และอุปกรณ์เครือข่าย" },
} as const;
type CategoryKey = keyof typeof CATEGORIES;

// available_qty ไม่ต้องกำหนด: คำนวณจาก total_qty − จำนวนที่อนุมัติแล้วยังไม่คืน
// archived = เก็บเข้าคลังแล้ว (เลิกใช้ แต่มีประวัติการเบิก)
const EQUIPMENTS: { code: string; name: string; total: number; category: CategoryKey; status?: "unavailable"; archived?: boolean }[] = [
  { code: "EQ-001", name: "โน้ตบุ๊ก Dell Latitude", total: 10, category: "computer" },
  { code: "EQ-002", name: "โปรเจกเตอร์ Epson", total: 5, category: "presentation" },
  { code: "EQ-003", name: "กล้องเว็บแคม Logitech", total: 8, category: "audioVisual" },
  { code: "EQ-004", name: "เมาส์ไร้สาย", total: 30, category: "computer" },
  { code: "EQ-005", name: "ไมโครโฟนไร้สาย", total: 6, category: "audioVisual" },
  { code: "EQ-006", name: "เครื่องพิมพ์เลเซอร์", total: 2, category: "office", status: "unavailable" },
  { code: "EQ-007", name: "คีย์บอร์ดไร้สาย", total: 20, category: "computer" },
  { code: "EQ-008", name: "จอมอนิเตอร์ 24 นิ้ว", total: 8, category: "computer" },
  { code: "EQ-009", name: "แท็บเล็ต iPad", total: 6, category: "computer" },
  { code: "EQ-010", name: "จอรับภาพแบบขาตั้ง", total: 3, category: "presentation" },
  { code: "EQ-011", name: "เลเซอร์พอยเตอร์", total: 10, category: "presentation" },
  { code: "EQ-012", name: "ทีวี 55 นิ้วแบบเคลื่อนที่", total: 2, category: "presentation" },
  { code: "EQ-013", name: "ลำโพงบลูทูธ", total: 4, category: "audioVisual" },
  { code: "EQ-014", name: "กล้องถ่ายภาพ Canon DSLR", total: 3, category: "audioVisual" },
  { code: "EQ-015", name: "ขาตั้งกล้อง", total: 5, category: "audioVisual" },
  { code: "EQ-016", name: "สาย HDMI 3 เมตร", total: 15, category: "accessory" },
  { code: "EQ-017", name: "ปลั๊กพ่วง 5 ช่อง", total: 12, category: "accessory" },
  { code: "EQ-018", name: "Pocket WiFi", total: 4, category: "accessory" },
  { code: "EQ-019", name: "เครื่องสแกนเอกสาร", total: 2, category: "office" },
  { code: "EQ-020", name: "เครื่องเคลือบบัตร", total: 3, category: "office" },
  { code: "EQ-021", name: "อะแดปเตอร์ USB-C", total: 10, category: "accessory" },
  { code: "EQ-022", name: "เครื่องฉายภาพ Visualizer รุ่นเก่า", total: 2, category: "presentation", archived: true },
];

type Username = (typeof USERS)[number]["username"];
type Status = "pending" | "approved" | "rejected" | "returned";

// คำขอย้อนหลัง 14 วัน (ให้แดชบอร์ดมีข้อมูลสาธิต) items = [รหัสอุปกรณ์, จำนวน]
const REQUESTS: { daysAgo: number; hour: number; suffix: string; user: Username; items: [string, number][]; reason: string; status: Status; note?: string }[] = [
  // ประวัติที่จบแล้ว (คืนแล้ว / ไม่อนุมัติ) ไม่กระทบสต็อกปัจจุบัน
  { daysAgo: 13, hour: 9, suffix: "H1A2", user: "somchai", items: [["EQ-002", 2], ["EQ-005", 2]], reason: "สัมมนาประจำไตรมาส", status: "returned" },
  { daysAgo: 13, hour: 14, suffix: "H2K7", user: "wichai", items: [["EQ-014", 1], ["EQ-015", 1]], reason: "ถ่ายภาพกิจกรรมองค์กร", status: "returned" },
  { daysAgo: 12, hour: 10, suffix: "H3V1", user: "wichai", items: [["EQ-022", 1]], reason: "ประชุมคณะกรรมการบริหาร", status: "returned" },
  { daysAgo: 12, hour: 14, suffix: "H3B4", user: "somying", items: [["EQ-001", 3]], reason: "อบรมระบบบัญชีใหม่", status: "returned" },
  { daysAgo: 11, hour: 10, suffix: "H4M2", user: "wichai", items: [["EQ-016", 4], ["EQ-017", 2]], reason: "จัดเตรียมห้องอบรม", status: "returned" },
  { daysAgo: 10, hour: 10, suffix: "H5C6", user: "somchai", items: [["EQ-004", 10], ["EQ-007", 10]], reason: "เปลี่ยนเมาส์และคีย์บอร์ดห้องปฏิบัติการ", status: "returned" },
  { daysAgo: 9, hour: 11, suffix: "H7D8", user: "somying", items: [["EQ-002", 4]], reason: "งานนิทรรศการ", status: "rejected", note: "ช่วงวันดังกล่าวมีประชุมใหญ่ใช้โปรเจกเตอร์อยู่ จำนวนไม่เพียงพอ" },
  { daysAgo: 9, hour: 15, suffix: "H8P5", user: "wichai", items: [["EQ-018", 2]], reason: "ปฏิบัติงานนอกสถานที่", status: "returned" },
  { daysAgo: 8, hour: 13, suffix: "H9E1", user: "somchai", items: [["EQ-001", 2], ["EQ-004", 2]], reason: "ปฏิบัติงานนอกสถานที่", status: "returned" },
  { daysAgo: 7, hour: 16, suffix: "J1Q3", user: "somying", items: [["EQ-012", 1], ["EQ-013", 2]], reason: "งานเลี้ยงสังสรรค์ประจำปี", status: "returned" },
  { daysAgo: 6, hour: 9, suffix: "J2F3", user: "somying", items: [["EQ-005", 3]], reason: "ประชุมใหญ่สามัญประจำปี", status: "returned" },
  { daysAgo: 5, hour: 15, suffix: "J4G5", user: "somchai", items: [["EQ-001", 4]], reason: "อบรมพนักงานใหม่รุ่นที่ 2", status: "returned" },
  { daysAgo: 5, hour: 11, suffix: "J5R8", user: "wichai", items: [["EQ-009", 2]], reason: "สำรวจข้อมูลภาคสนาม", status: "returned" },
  { daysAgo: 4, hour: 10, suffix: "J6H7", user: "somying", items: [["EQ-004", 6], ["EQ-002", 1]], reason: "ใช้ประชุมและนำเสนองาน", status: "returned" },
  { daysAgo: 4, hour: 14, suffix: "J7S1", user: "wichai", items: [["EQ-019", 1]], reason: "สแกนเอกสารเก่าเข้าระบบ", status: "rejected", note: "เครื่องสแกนอยู่ระหว่างซ่อมบำรุง กรุณาติดต่อฝ่ายไอทีเพื่อใช้เครื่องสำรอง" },
  // อนุมัติแล้วยังไม่คืน → ตัดสต็อกปัจจุบัน
  { daysAgo: 3, hour: 9, suffix: "A1B2", user: "somchai", items: [["EQ-001", 2]], reason: "ใช้สำหรับอบรมพนักงานใหม่", status: "approved", note: "รับอุปกรณ์ได้ที่ห้องพัสดุ ชั้น 2" },
  { daysAgo: 3, hour: 13, suffix: "A3T6", user: "wichai", items: [["EQ-009", 4]], reason: "สำรวจข้อมูลภาคสนามรอบที่ 2", status: "approved" },
  { daysAgo: 2, hour: 14, suffix: "C3D4", user: "somying", items: [["EQ-003", 8]], reason: "ติดตั้งห้องประชุมออนไลน์ชั่วคราว", status: "approved" },
  { daysAgo: 2, hour: 16, suffix: "K8L9", user: "somchai", items: [["EQ-005", 1]], reason: "ทดแทนอุปกรณ์ที่ชำรุด", status: "rejected", note: "กรุณาส่งไมโครโฟนตัวที่ชำรุดเข้าซ่อมก่อน แล้วจึงขอเบิกทดแทน" },
  { daysAgo: 1, hour: 9, suffix: "B6U4", user: "wichai", items: [["EQ-015", 4], ["EQ-016", 3]], reason: "ถ่ายทำวิดีโอประชาสัมพันธ์", status: "approved", note: "กรุณาคืนภายในวันศุกร์นี้" },
  // รออนุมัติ (คำขอแรกเบิก 2 อุปกรณ์ในคำขอเดียว)
  { daysAgo: 1, hour: 10, suffix: "E5F6", user: "somying", items: [["EQ-002", 1], ["EQ-005", 2]], reason: "ประชุมนำเสนองานประจำเดือน", status: "pending" },
  { daysAgo: 0, hour: 9, suffix: "G7H8", user: "somchai", items: [["EQ-004", 5]], reason: "เปลี่ยนเมาส์ที่ชำรุดในห้องปฏิบัติการ", status: "pending" },
];

// ---------- ใส่ข้อมูล ----------

const DAY = 24 * 60 * 60 * 1000;

function at(daysAgo: number, hour: number): Date {
  const d = new Date(Date.now() - daysAgo * DAY);
  d.setHours(hour, 15, 0, 0);
  return d;
}

function requestNo(date: Date, suffix: string): string {
  const ymd = [date.getFullYear() % 100, date.getMonth() + 1, date.getDate()]
    .map((n) => String(n).padStart(2, "0"))
    .join("");
  return `REQ-${ymd}-${suffix}`;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("ไม่พบ MONGODB_URI ใน .env.local");

  await mongoose.connect(uri);
  console.log(`เชื่อมต่อฐานข้อมูล "${mongoose.connection.name}" แล้ว`);

  const models = [UserModel, CategoryModel, EquipmentModel, RequisitionModel, ActivityLogModel] as const;
  await Promise.all(models.map((m) => (m as typeof UserModel).deleteMany({})));
  // สร้าง index (เช่น unique) ให้ครบก่อนใส่ข้อมูล
  await Promise.all(models.map((m) => (m as typeof UserModel).syncIndexes()));

  const users = await UserModel.create(USERS.map((u) => ({ ...u })));
  const userId = new Map(users.map((u) => [u.username, u._id]));

  const categoryKeys = Object.keys(CATEGORIES) as CategoryKey[];
  const categories = await CategoryModel.create(categoryKeys.map((k) => CATEGORIES[k]));
  const categoryId = new Map(categoryKeys.map((k, i) => [k, categories[i]._id]));

  // จำนวนที่ถูกเบิกออกไปอยู่ (อนุมัติแล้วยังไม่คืน) ของแต่ละรหัส
  const inUse = new Map<string, number>();
  for (const r of REQUESTS) {
    if (r.status !== "approved") continue;
    for (const [code, qty] of r.items) inUse.set(code, (inUse.get(code) ?? 0) + qty);
  }

  const equipments = await EquipmentModel.create(
    EQUIPMENTS.map((e) => {
      const available = e.total - (inUse.get(e.code) ?? 0);
      if (available < 0) throw new Error(`ข้อมูลตัวอย่างผิด: ${e.code} ถูกเบิกเกินจำนวนทั้งหมด`);
      return {
        item_code: e.code,
        name: e.name,
        total_qty: e.total,
        available_qty: available,
        status: e.status ?? ("available" as const),
        category_id: categoryId.get(e.category) ?? null,
        deleted_at: e.archived ? new Date(Date.now() - 3 * DAY) : null,
      };
    }),
  );
  const equipmentId = new Map<string, Types.ObjectId>(equipments.map((e) => [e.item_code, e._id]));

  const adminId = userId.get("admin");
  const docs = REQUESTS.flatMap((r) => {
    const created = at(r.daysAgo, r.hour);
    // คำขอที่พิจารณาแล้ว: สมมติว่า admin ตอบภายใน 2 ชั่วโมง
    const reviewed = r.status !== "pending";
    return r.items.map(([code, quantity]) => {
      const id = equipmentId.get(code);
      if (!id) throw new Error(`ข้อมูลตัวอย่างผิด: ไม่พบรหัส ${code}`);
      return {
        request_no: requestNo(created, r.suffix),
        user_id: userId.get(r.user),
        equipment_id: id,
        quantity,
        reason: r.reason,
        status: r.status,
        admin_note: r.note ?? "",
        reviewed_by: reviewed ? adminId : null,
        reviewed_at: reviewed ? new Date(created.getTime() + 2 * 60 * 60 * 1000) : null,
        created_at: created,
        updated_at: created,
      };
    });
  });
  // insert ตรงเข้า collection เพื่อกำหนด created_at ย้อนหลังเองได้ (mongoose timestamps จะเขียนทับ)
  await RequisitionModel.collection.insertMany(docs);

  console.log(
    `ใส่ข้อมูลตัวอย่างเรียบร้อย: users ${users.length}, categories ${categories.length}, ` +
      `equipments ${equipments.length}, requisitions ${docs.length} (${REQUESTS.length} คำขอ)`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
