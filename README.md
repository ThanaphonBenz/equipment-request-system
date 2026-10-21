# ระบบเบิกจ่ายอุปกรณ์ (Equipment Request System)

เว็บแอปพลิเคชันสำหรับเบิกจ่ายอุปกรณ์ ผู้ใช้ทั่วไปส่งคำขอเบิกได้ และผู้ดูแลระบบอนุมัติหรือปฏิเสธคำขอได้ เมื่ออนุมัติแล้ว ระบบจะตัดจำนวนคงเหลือในสต็อกอัตโนมัติ

รองรับโหมดสว่างและโหมดมืด โดยเลือกสลับได้จากแถบเมนูหรือหน้าเข้าสู่ระบบ และระบบจะจดจำตัวเลือกไว้ในเบราว์เซอร์

**Tech stack:** Next.js 16 (App Router) · TypeScript · MongoDB Atlas + Mongoose · Tailwind CSS · Zod

## การติดตั้งและรันโปรเจกต์

ต้องมี **Node.js 20.12 ขึ้นไป** (พัฒนาด้วย Node 24)

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. สร้างไฟล์ตั้งค่า แล้วแก้ค่า MONGODB_URI และ SESSION_SECRET
cp .env.example .env.local

# 3. ใส่ข้อมูลตัวอย่างลงฐานข้อมูล
npm run seed

# 4. รันโหมดพัฒนา
npm run dev
```

เปิด **http://localhost:3000**

รันแบบ production ด้วย `npm run build` แล้วตามด้วย `npm start` (พอร์ต 3000)

### การตั้งค่าการเชื่อมต่อฐานข้อมูล (`.env.local`)

| ตัวแปร | คำอธิบาย |
|---|---|
| `MONGODB_URI` | Connection string จาก MongoDB Atlas (Database → Connect → Drivers) ใส่ชื่อฐานข้อมูลต่อท้าย เช่น `.../equipment_request?retryWrites=true&w=majority` |
| `SESSION_SECRET` | ข้อความสุ่มยาวๆ สำหรับเซ็น cookie สร้างได้ด้วย `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

> ใน MongoDB Atlas ให้ไปที่ **Network Access** แล้วเพิ่ม IP ของเครื่องที่รัน มิฉะนั้นจะเชื่อมต่อไม่ได้

### ข้อมูลตัวอย่าง (จาก `npm run seed`)

หมวดหมู่ 5 หมวด, อุปกรณ์ 21 รายการ และประวัติคำขอย้อนหลัง 14 วัน (มีทั้งรออนุมัติ อนุมัติแล้ว ไม่อนุมัติ และคืนแล้ว) จำนวนคงเหลือคำนวณจากคำขอที่อนุมัติแล้วโดยอัตโนมัติ

### ผู้ใช้ตัวอย่าง

เข้าสู่ระบบด้วยชื่อผู้ใช้อย่างเดียว โจทย์ไม่ได้กำหนดให้มีรหัสผ่าน

| username | role |
|---|---|
| `admin` | admin |
| `somchai` | user |
| `somying` | user |
| `wichai` | user |

## โครงสร้างโปรเจกต์ (MVC)

```
├── database/
│   ├── seed.ts                 # ข้อมูลตัวอย่าง
│   └── README.md               # โครงสร้าง collection
└── src/
    ├── app/                    # View + Routes
    │   ├── (main)/             # หน้าที่ต้องเข้าสู่ระบบ
    │   │   ├── page.tsx                    # รายการอุปกรณ์
    │   │   ├── requisitions/page.tsx       # คำขอของฉัน
    │   │   ├── requisitions/new/page.tsx   # ฟอร์มขอเบิก
    │   │   ├── admin/page.tsx              # admin แดชบอร์ด
    │   │   ├── admin/requisitions/page.tsx # admin พิจารณาคำขอ
    │   │   ├── admin/equipments/page.tsx   # admin จัดการอุปกรณ์
    │   │   ├── admin/categories/page.tsx   # admin หมวดหมู่อุปกรณ์
    │   │   └── admin/logs/page.tsx         # admin ประวัติการใช้งาน
    │   ├── login/page.tsx
    │   └── api/                # Route → เรียก controller
    ├── controllers/            # Controller: ตรวจสิทธิ์ ตรวจข้อมูล และส่ง response
    ├── services/               # Business logic (ตรวจจำนวน, ตัด/คืนสต็อก)
    ├── models/                 # Model: Mongoose schema
    ├── components/             # UI components
    ├── lib/                    # DB connection, session, validation, helpers
    └── types/
```

ลำดับการทำงานของ request:
`Browser → app/api/*/route.ts → controllers → services → models → MongoDB`

## API

| Method | Endpoint | สิทธิ์ | คำอธิบาย |
|---|---|---|---|
| POST | `/api/auth/login` | - | `{ username }` |
| POST | `/api/auth/logout` | - | ออกจากระบบ |
| GET | `/api/auth/me` | user | ผู้ใช้ปัจจุบัน |
| GET | `/api/equipments` | user | รายการอุปกรณ์และจำนวนคงเหลือ |
| GET | `/api/categories` | user | หมวดหมู่ทั้งหมด พร้อมจำนวนอุปกรณ์ในแต่ละหมวด |
| POST | `/api/categories` | admin | `{ name, description }` |
| PUT | `/api/categories/:id` | admin | แก้ไขหมวดหมู่ |
| DELETE | `/api/categories/:id` | admin | ลบได้เฉพาะหมวดที่ไม่มีอุปกรณ์ |
| POST | `/api/equipments` | admin | `{ item_code, name, total_qty, status, category_id }` (category_id เป็น null ได้) คงเหลือเริ่มต้น = total_qty |
| PUT | `/api/equipments/:id` | admin | แก้ไขอุปกรณ์ (body เหมือน POST) |
| GET | `/api/equipments?archived=1` | admin | อุปกรณ์ในคลัง |
| DELETE | `/api/equipments/:id` | admin | ไม่มีประวัติการเบิก → ลบถาวร / มีประวัติ → เก็บเข้าคลัง (response มี `mode`) ห้ามถ้ามีคำขอ pending/approved ค้างอยู่ |
| POST | `/api/equipments/:id/restore` | admin | กู้คืนอุปกรณ์จากคลัง |
| GET | `/api/requisitions` | user | คำขอของตัวเอง (`?status=pending`) |
| GET | `/api/requisitions?scope=all` | admin | คำขอทั้งหมด |
| POST | `/api/requisitions` | user | `{ items: [{ equipmentId, quantity }], reason }` เบิกได้หลายรายการ (ไม่เกิน 20) ทุกรายการต้องไม่เกินคงเหลือ |
| GET | `/api/logs?type=&q=&page=` | admin | ประวัติการใช้งาน (type: `requisition` | `equipment` | `auth`), 20 รายการต่อหน้า |
| PATCH | `/api/requisitions/:id` | admin | `{ status: "approved" \| "rejected" \| "returned", note? }` โดย `note` บังคับเมื่อไม่อนุมัติ (อย่างน้อย 5 ตัวอักษร) |

## กฎทางธุรกิจที่สำคัญ

- **เบิกหลายอุปกรณ์ในคำขอเดียว:** บันทึกเป็น 1 แถวต่อ 1 อุปกรณ์ (ตรงกับโครงสร้างตาราง `requisitions` ในโจทย์) แล้วผูกกันด้วย `request_no` เดียวกัน เช่น `REQ-261020-K7Q2` ถ้ามีรายการไหนเกินคงเหลือจะไม่บันทึกเลยสักรายการ และ admin อนุมัติหรือไม่อนุมัติแยกทีละรายการได้
- **หมายเหตุการพิจารณา:** ไม่อนุมัติต้องระบุเหตุผล ส่วนอนุมัติใส่หมายเหตุได้แต่ไม่บังคับ ระบบเก็บ `admin_note`, `reviewed_by` และ `reviewed_at` ผู้ขอเห็นเหตุผลในหน้าคำขอของฉัน
- **ตรวจจำนวนสองชั้น:** ฟอร์มตรวจฝั่ง client ด้วย Zod schema เดียวกับฝั่ง server และ server ตรวจซ้ำว่า `quantity ≤ available_qty`
- **อนุมัติแล้วตัดสต็อกอัตโนมัติ:** ใช้ `findOneAndUpdate` ที่มีเงื่อนไข `available_qty >= quantity` ร่วมกับ `$inc` ในคำสั่งเดียว (atomic) สต็อกจึงไม่ติดลบ แม้มีการอนุมัติพร้อมกันหลายรายการ
- **ป้องกันอนุมัติซ้ำ:** เปลี่ยนสถานะได้เฉพาะจาก `pending` เท่านั้น ถ้า admin สองคนกดพร้อมกัน จะสำเร็จเพียงคนเดียว
- **บันทึกการคืน** (`approved → returned`) จะบวก `available_qty` กลับคืน
- **แก้จำนวนทั้งหมดของอุปกรณ์:** `available_qty` ปรับตามส่วนต่าง เพื่อให้จำนวนที่ถูกเบิกอยู่ (`total_qty − available_qty`) เท่าเดิม และตั้ง `total_qty` ต่ำกว่าจำนวนที่ถูกเบิกอยู่ไม่ได้ ทั้งหมดทำใน update pipeline คำสั่งเดียว
- **แดชบอร์ด admin** (`/admin`, เปิดเป็นหน้าแรกหลัง admin login): ตัวเลขสรุป (รออนุมัติ, ขอเบิกเดือนนี้, ถูกเบิกออกไปอยู่, หมด/ใกล้หมด), กราฟคำขอรายวัน 14 วัน, สถานะคำขอ, อุปกรณ์ที่ถูกเบิกมากที่สุด, อุปกรณ์ที่ต้องเติม, คำขอรออนุมัติล่าสุด และกิจกรรมล่าสุด ข้อมูลรวมด้วย MongoDB aggregation ใน `services/dashboard.service.ts` นับวันตามเวลาไทย
- **ประวัติการใช้งาน (audit log):** บันทึกการเข้าสู่ระบบ การส่ง/อนุมัติ/ไม่อนุมัติ/คืน (พร้อมสต็อกก่อน→หลัง) และการเพิ่ม/แก้ไข (เก็บค่าก่อน→หลังของแต่ละ field)/ลบอุปกรณ์ ลงตาราง `activity_logs` เก็บชื่อผู้ทำและชื่อเป้าหมายแบบ snapshot จึงอ่านได้แม้ข้อมูลต้นทางถูกลบ บันทึกเฉพาะ action ที่สำเร็จ และถ้าบันทึก log ไม่สำเร็จจะไม่ทำให้งานหลักล้มเหลว
- **หมวดหมู่อุปกรณ์:** ตาราง `categories` แยกจากอุปกรณ์ (อุปกรณ์อ้างอิงด้วย `category_id` ซึ่งไม่บังคับ) กรองตามหมวดได้ในหน้ารายการอุปกรณ์ หน้าต่างเลือกอุปกรณ์ และหน้าจัดการอุปกรณ์ ลบหมวดได้เฉพาะเมื่อไม่มีอุปกรณ์อยู่
- **ลบหรือซ่อนอุปกรณ์:** ทำไม่ได้ถ้ายังมีคำขอที่รออนุมัติ หรือมีผู้ยืมอยู่ยังไม่คืน
- **ลบอุปกรณ์ = ลบถาวร หรือเก็บเข้าคลัง:** ถ้าไม่เคยมีใครขอเบิกจะลบออกจากฐานข้อมูล ถ้ามีประวัติแล้วจะบันทึก `deleted_at` แทน (soft delete) อุปกรณ์ในคลังหายจากทุกหน้าใช้งานและไม่นับในสต็อก แต่ประวัติคำขอยังแสดงชื่อ/รหัสได้ครบ รหัสยังถูกจองไว้ และกู้คืนได้จากแท็บ "คลัง" ในหน้าจัดการอุปกรณ์
- **ซ่อนอุปกรณ์** (`status: "unavailable"`): ผู้ใช้ทั่วไปจะไม่เห็นและเบิกไม่ได้ (กรองตั้งแต่ API) admin ยังเห็นพร้อมป้าย "ซ่อนอยู่"
- **ป้ายสถานะอุปกรณ์:** คำนวณจากจำนวนคงเหลือ ได้แก่ พร้อมให้เบิก, ใกล้หมด (เหลือไม่เกิน 30%), หมด และซ่อนอยู่
