import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { getCurrentUser } from "@/lib/session";
import { countRequisitions } from "@/services/requisition.service";

// ทุกหน้าในกลุ่ม (main) ต้องเข้าสู่ระบบก่อน
export default async function MainLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const pendingCount = user.role === "admin" ? await countRequisitions({ status: "pending" }) : 0;

  return (
    <div className="min-h-screen">
      <Sidebar user={user} pendingCount={pendingCount} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
