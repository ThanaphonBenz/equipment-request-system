import { PageHeader } from "@/components/PageHeader";
import { RequisitionForm } from "@/components/RequisitionForm";

// ?equipment=id1,id2 (มาจากการเลือกหลายรายการในหน้ารายการอุปกรณ์)
function parseIds(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  const ids = raw.split(",").map((s) => s.trim()).filter((s) => /^[a-f\d]{24}$/i.test(s));
  return [...new Set(ids)];
}

export default async function NewRequisitionPage({ searchParams }: PageProps<"/requisitions/new">) {
  const { equipment } = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader title="ขอเบิกอุปกรณ์" description="จำนวนที่ขอเบิกต้องไม่เกินจำนวนคงเหลือ" />
      <RequisitionForm initialEquipmentIds={parseIds(equipment)} />
    </div>
  );
}
