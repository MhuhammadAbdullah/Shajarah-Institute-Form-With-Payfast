import type { ReactNode } from "react";
import Link from "next/link";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { logoutAdminAction } from "@/actions/admin-auth.actions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getCurrentAdmin();

  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      {admin && (
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/admin/dashboard" className="font-semibold text-slate-900">
              Shajarah Institute — Admin
            </Link>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span>{admin.name}</span>
              <form action={logoutAdminAction}>
                <button type="submit" className="font-medium text-emerald-700 hover:underline">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>
      )}
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
