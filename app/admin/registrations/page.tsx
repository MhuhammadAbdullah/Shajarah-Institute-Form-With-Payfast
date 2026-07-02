import Link from "next/link";
import type { PaymentStatus } from "@prisma/client";
import { listRegistrations } from "@/services/admin.service";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS: PaymentStatus[] = ["PENDING", "PAID", "FAILED", "CANCELLED"];

const STATUS_BADGE: Record<PaymentStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-800",
  CANCELLED: "bg-slate-100 text-slate-600",
};

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}

export default async function AdminRegistrationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search ?? "";
  const status = STATUS_OPTIONS.includes(params.status as PaymentStatus) ? (params.status as PaymentStatus) : undefined;
  const page = params.page ? Number(params.page) : 1;

  const { registrations, total, totalPages } = await listRegistrations({ search, status, page });

  const exportQuery = new URLSearchParams();
  if (search) exportQuery.set("search", search);
  if (status) exportQuery.set("status", status);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Registrations</h1>
          <p className="text-sm text-slate-500">{total} total registrations</p>
        </div>
        <a href={`/api/admin/registrations/export?${exportQuery.toString()}`}>
          <Button variant="secondary">Export CSV</Button>
        </a>
      </div>

      <Card>
        <form className="flex flex-wrap gap-3" method="GET">
          <Input
            name="search"
            defaultValue={search}
            placeholder="Search by name, email, phone, basket ID…"
            className="max-w-xs"
          />
          {/* <Select name="status" defaultValue={status ?? ""} placeholder="All statuses" className="max-w-[180px]"> */}
          <Select name="status" defaultValue={status ?? ""} placeholder="All statuses" className="max-w-45">
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.charAt(0) + option.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Basket ID", "Student", "Program", "Fee", "Status", "Created", ""].map((header) => (
                <th key={header} className="px-4 py-3 text-left font-semibold text-slate-600">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {registrations.map((registration) => (
              <tr key={registration.id}>
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{registration.basketId}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{registration.studentName}</div>
                  <div className="text-xs text-slate-500">{registration.email}</div>
                </td>
                <td className="px-4 py-3 text-slate-700">{registration.program}</td>
                <td className="px-4 py-3 text-slate-700">{Number(registration.fee).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[registration.paymentStatus]}`}>
                    {registration.paymentStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Intl.DateTimeFormat("en-PK", { dateStyle: "medium" }).format(registration.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/registrations/${registration.id}`} className="font-medium text-emerald-700 hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {registrations.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No registrations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => {
            const query = new URLSearchParams();
            if (search) query.set("search", search);
            if (status) query.set("status", status);
            query.set("page", String(pageNumber));
            return (
              <Link
                key={pageNumber}
                href={`/admin/registrations?${query.toString()}`}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  pageNumber === page ? "bg-emerald-700 text-white" : "bg-white text-slate-600 border border-slate-200"
                }`}
              >
                {pageNumber}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
