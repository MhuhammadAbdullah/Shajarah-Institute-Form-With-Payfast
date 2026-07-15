import Link from "next/link";
import { getDashboardStats, getRecentRegistrations, getRecentPayments, getDailySeries } from "@/services/dashboard.service";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/admin/StatCard";
import { DashboardChart } from "@/components/admin/DashboardChart";
import { ActivityTimeline, type ActivityEvent, type ActivityTone } from "@/components/admin/ActivityTimeline";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/utils/format-date";

export const dynamic = "force-dynamic";

function TotalIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-3.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4" />
    </svg>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function RevenueIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .672-3 1.5S10.343 11 12 11s3 .672 3 1.5-1.343 1.5-3 1.5m0-6V6m0 7v2m-9-3a9 9 0 1018 0 9 9 0 00-18 0z" />
    </svg>
  );
}

function ProgramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.42A9.05 9.05 0 0121 12a9.05 9.05 0 01-2.84 6.42L12 14zm0 0l-6.16-3.42A9.05 9.05 0 003 12a9.05 9.05 0 002.84 6.42L12 14z" />
    </svg>
  );
}

function SessionIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function CampusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1m-6 4h1m4 0h1" />
    </svg>
  );
}

const PAYMENT_STATUS_TONE: Record<string, ActivityTone> = {
  PENDING: "warning",
  PAID: "success",
  FAILED: "danger",
  CANCELLED: "neutral",
  REFUNDED: "info",
};

const PAYMENT_GATEWAY_STATUS_TONE: Record<string, ActivityTone> = {
  INITIATED: "warning",
  SUCCESS: "success",
  FAILED: "danger",
  REFUNDED: "info",
};

export default async function AdminDashboardPage() {
  const [stats, recentRegistrations, recentPayments, dailySeries] = await Promise.all([
    getDashboardStats(),
    getRecentRegistrations(6),
    getRecentPayments(6),
    getDailySeries(30),
  ]);

  const activityEvents: ActivityEvent[] = [
    ...recentRegistrations.map(
      (registration): ActivityEvent => ({
        id: `registration-${registration.id}`,
        title: `${registration.studentName} registered`,
        description: `${registration.program} — ${registration.basketId}`,
        timestamp: registration.createdAt,
        tone: PAYMENT_STATUS_TONE[registration.paymentStatus] ?? "neutral",
        href: `/admin/registrations/${registration.id}`,
      }),
    ),
    ...recentPayments.map(
      (payment): ActivityEvent => ({
        id: `payment-${payment.id}`,
        title: `Payment ${payment.status.toLowerCase()} — ${payment.registration.studentName}`,
        description: `PKR ${Number(payment.amount).toLocaleString()} — ${payment.basketId}`,
        timestamp: payment.createdAt,
        tone: PAYMENT_GATEWAY_STATUS_TONE[payment.status] ?? "neutral",
        href: `/admin/registrations/${payment.registration.id}`,
      }),
    ),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Overview of registrations, payments, and activity.</p>
        </div>
        <form action="/admin/registrations" method="GET" className="flex w-full max-w-sm gap-2">
          <input
            type="search"
            name="search"
            placeholder="Search name, email, phone, basket ID…"
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Search
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <StatCard label="Total Registrations" value={stats.totalRegistrations} icon={TotalIcon} accent="bg-slate-100 text-slate-600" />
        <StatCard label="Paid Registrations" value={stats.paidRegistrations} icon={CheckIcon} accent="bg-emerald-50 text-emerald-600" />
        <StatCard label="Pending Payments" value={stats.pendingPayments} icon={ClockIcon} accent="bg-amber-50 text-amber-600" />
        <StatCard label="Revenue" value={stats.revenue} icon={RevenueIcon} accent="bg-emerald-50 text-emerald-700" format="currency" />
        <StatCard label="Programs" value={stats.programsCount} icon={ProgramIcon} accent="bg-sky-50 text-sky-600" />
        <StatCard label="Active Sessions" value={stats.activeSessionsCount} icon={SessionIcon} accent="bg-purple-50 text-purple-600" />
        <StatCard label="Campuses" value={stats.campusesCount} icon={CampusIcon} accent="bg-slate-100 text-slate-600" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <h2 className="mb-4 text-base font-semibold text-slate-900">Registrations &amp; Revenue — Last 30 Days</h2>
            <DashboardChart data={dailySeries} />
          </Card>

          <Card className="overflow-x-auto p-0">
            <div className="flex items-center justify-between px-6 pt-6">
              <h2 className="text-base font-semibold text-slate-900">Recent Registrations</h2>
              <Link href="/admin/registrations" className="text-sm font-medium text-emerald-700 hover:underline">
                View all
              </Link>
            </div>
            <table className="mt-4 min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Program</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No registrations yet.
                    </td>
                  </tr>
                ) : (
                  recentRegistrations.map((registration) => (
                    <tr key={registration.id}>
                      <td className="px-4 py-3">
                        <Link href={`/admin/registrations/${registration.id}`} className="font-medium text-slate-900 hover:text-emerald-700 hover:underline">
                          {registration.studentName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{registration.program}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={registration.paymentStatus} />
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(registration.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="mb-4 text-base font-semibold text-slate-900">Quick Actions</h2>
            <div className="flex flex-col gap-2">
              <Link href="/admin/registrations" className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800">
                View All Registrations
              </Link>
              <Link href="/admin/programs" className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800">
                Add Program
              </Link>
              <Link href="/admin/campuses" className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800">
                Add Campus
              </Link>
              <Link href="/admin/sessions" className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800">
                Add Session
              </Link>
              <Link href="/admin/fee-structures" className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800">
                Manage Fee Structures
              </Link>
              <a href="/api/admin/registrations/export" className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800">
                Export Registrations (CSV)
              </a>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-semibold text-slate-900">Recent Activity</h2>
            <ActivityTimeline events={activityEvents} />
          </Card>
        </div>
      </div>
    </div>
  );
}
