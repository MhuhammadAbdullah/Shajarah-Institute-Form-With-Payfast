import type { ReactNode } from "react";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return <div className="flex flex-1 flex-col bg-slate-50">{children}</div>;
  }

  return (
    <div className="flex h-full flex-1 flex-col lg:flex-row">
      <AdminSidebar adminName={admin.name} />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-6 lg:p-8">{children}</main>
    </div>
  );
}
