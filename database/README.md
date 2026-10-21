# โครงสร้างฐานข้อมูล (MongoDB)

ฐานข้อมูล: `equipment_request` (กำหนดในชื่อท้าย `MONGODB_URI`)
Schema ในโค้ดอยู่ที่ `src/models/`

ใส่ข้อมูลตัวอย่างด้วย `npm run seed` (สคริปต์ `database/seed.ts` จะ**ลบข้อมูลเดิม**ใน 3 collection ก่อน)

## users

| Field | Type | หมายเหตุ |
|---|---|---|
| `_id` | ObjectId | PK |
| `username` | String | unique, ตัวพิมพ์เล็ก |
| `fullname` | String | |
| `role` | String | `admin` \| `user` |
| `created_at`, `updated_at` | Date | อัตโนมัติ |

## categories

| Field | Type | หมายเหตุ |
|---|---|---|
| `_id` | ObjectId | PK |
| `name` | String | unique |
| `description` | String | ไม่บังคับ |
| `created_at`, `updated_at` | Date | อัตโนมัติ |

## equipments

| Field | Type | หมายเหตุ |
|---|---|---|
| `_id` | ObjectId | PK |
| `category_id` | ObjectId → categories | ไม่บังคับ (null = ไม่ระบุหมวดหมู่), index |
| `item_code` | String | unique, ตัวพิมพ์ใหญ่ เช่น `EQ-001` |
| `name` | String | |
| `total_qty` | Number | ≥ 0 |
| `available_qty` | Number | 0 ≤ available_qty ≤ total_qty |
| `status` | String | `available` (แสดงให้เบิก) \| `unavailable` (ซ่อนจากผู้ใช้) |
| `deleted_at` | Date | null = ใช้งานอยู่, มีค่า = เก็บเข้าคลังแล้ว (soft delete), index |
| `created_at`, `updated_at` | Date | อัตโนมัติ |

## requisitions

| Field | Type | หมายเหตุ |
|---|---|---|
| `_id` | ObjectId | PK |
| `request_no` | String | เลขที่คำขอ เช่น `REQ-261020-K7Q2` รายการที่ส่งพร้อมกันใช้เลขเดียวกัน, index |
| `user_id` | ObjectId → users | index |
| `equipment_id` | ObjectId → equipments | |
| `quantity` | Number | ≥ 1 |
| `reason` | String | |
| `status` | String | `pending` \| `approved` \| `rejected` \| `returned`, index |
| `admin_note` | String | หมายเหตุจาก admin (บังคับเมื่อไม่อนุมัติ) |
| `reviewed_by` | ObjectId → users | admin ผู้พิจารณา (null = ยังไม่พิจารณา) |
| `reviewed_at` | Date | เวลาที่พิจารณา |
| `created_at`, `updated_at` | Date | อัตโนมัติ |

## activity_logs

บันทึกการใช้งาน (เขียนอย่างเดียว ไม่แก้ไขภายหลัง)

| Field | Type | หมายเหตุ |
|---|---|---|
| `_id` | ObjectId | PK |
| `actor_id` | ObjectId → users | ผู้ทำ, index |
| `actor_username`, `actor_fullname` | String | snapshot ชื่อผู้ทำ ณ เวลานั้น |
| `action` | String | `auth.login`, `requisition.create` | `approve` | `reject` | `return`, `equipment.create` | `update` | `delete`, `category.create` | `update` | `delete` |
| `target_type` | String | `auth` | `requisition` | `equipment` | `category`, index |
| `target_id` | ObjectId | เอกสารที่ถูกกระทำ (ถ้ามี) |
| `target_label` | String | snapshot เช่น `REQ-261020-K7Q2 · EQ-001` |
| `description` | String | ข้อความอธิบายภาษาไทย |
| `details` | Mixed | ข้อมูลประกอบ เช่น `stock: { before, after }`, `changes: [{ field, from, to }]` |
| `created_at` | Date | อัตโนมัติ, index |

## การเปลี่ยนสถานะคำขอ

```
pending ──อนุมัติ──▶ approved ──คืนของ──▶ returned
   │                (available_qty − quantity)   (available_qty + quantity)
   └──ไม่อนุมัติ──▶ rejected
```
