import Link from "next/link";
import type { PaymentStatus } from "@prisma/client";
import { listRegistrations, getRegistrationCounts } from "@/services/admin.service";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/utils/format-date";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS: PaymentStatus[] = ["PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED"];

const VIEW_OPTIONS = ["default", "pending", "all"] as const;
type View = (typeof VIEW_OPTIONS)[number];

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string; view?: string }>;
}

export default async function AdminRegistrationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search ?? "";
  const status = STATUS_OPTIONS.includes(params.status as PaymentStatus) ? (params.status as PaymentStatus) : undefined;
  const page = params.page ? Number(params.page) : 1;
  const view: View = VIEW_OPTIONS.includes(params.view as View) ? (params.view as View) : "default";

  const [{ registrations, total, totalPages }, counts] = await Promise.all([
    listRegistrations({ search, status, page, view }),
    getRegistrationCounts(),
  ]);

  const exportQuery = new URLSearchParams();
  if (search) exportQuery.set("search", search);
  if (status) exportQuery.set("status", status);

  function viewHref(nextView: View) {
    const query = new URLSearchParams();
    if (nextView !== "default") query.set("view", nextView);
    return `/admin/registrations${query.toString() ? `?${query.toString()}` : ""}`;
  }

  const tabs: { view: View; label: string; count: number }[] = [
    { view: "default", label: "Paid / Failed / Refunded", count: counts.nonPending },
    { view: "pending", label: "Pending", count: counts.pending },
    { view: "all", label: "All", count: counts.total },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Registrations</h1>
          <p className="text-sm text-slate-500">{total} registrations in this view</p>
        </div>
        <a href={`/api/admin/registrations/export?${exportQuery.toString()}`}>
          <Button variant="secondary">Export CSV</Button>
        </a>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {tabs.map((tab) => (
          <Link
            key={tab.view}
            href={viewHref(tab.view)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
              view === tab.view
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{tab.count}</span>
          </Link>
        ))}
      </div>

      <Card>
        <form className="flex flex-wrap gap-3" method="GET">
          {view !== "default" && <input type="hidden" name="view" value={view} />}
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
                  <StatusBadge status={registration.paymentStatus} />
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{formatDate(registration.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/registrations/${registration.id}`} className="font-medium text-emerald-700 hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {registrations.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    title="No registrations found"
                    description={search || status ? "Try adjusting your search or filters." : "Registrations will appear here once customers start signing up."}
                  />
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
            if (view !== "default") query.set("view", view);
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
