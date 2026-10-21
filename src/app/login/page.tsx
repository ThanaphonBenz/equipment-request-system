import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { LoginHero } from "@/components/LoginHero";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentUser } from "@/lib/session";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/");

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      {/* ฝั่งซ้าย: ภาพเคลื่อนไหว (แสดงเฉพาะจอใหญ่) */}
      <LoginHero />

      {/* ฝั่งขวา: ฟอร์มเข้าสู่ระบบ */}
      <div className="relative flex items-center justify-center px-4 py-16">
        <div className="absolute right-4 top-4">
          <ThemeToggle className="w-40" />
        </div>
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <Logo className="mx-auto mb-4 h-14 w-14 drop-shadow-lg lg:hidden" />
            <h1 className="text-2xl font-semibold text-slate-900">ยินดีต้อนรับ</h1>
            <p className="mt-1 text-sm text-slate-500">เข้าสู่ระบบเบิกจ่ายอุปกรณ์เพื่อใช้งาน</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
