import Link from "next/link";
import { getRegistrationCounts } from "@/services/admin.service";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const counts = await getRegistrationCounts();

  const stats = [
    { label: "Total Registrations", value: counts.total },
    { label: "Pending Payment", value: counts.pending },
    { label: "Paid", value: counts.paid },
    { label: "Failed", value: counts.failed },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of registrations and payments.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="text-center">
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="mt-1 text-xs text-slate-500">{stat.label}</p>
          </Card>
        ))}
      </div>

      <Link
        href="/admin/registrations"
        className="inline-flex w-fit items-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
      >
        View All Registrations
      </Link>
    </div>
  );
}
