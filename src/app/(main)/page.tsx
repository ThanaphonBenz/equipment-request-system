import { EquipmentTable } from "@/components/EquipmentTable";
import { PageHeader } from "@/components/PageHeader";

export default function EquipmentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="รายการอุปกรณ์" description="ตรวจสอบจำนวนคงเหลือและส่งคำขอเบิกอุปกรณ์" />
      <EquipmentTable />
    </div>
  );
}
