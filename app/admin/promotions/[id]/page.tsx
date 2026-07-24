import { notFound } from "next/navigation";
import Link from "next/link";
import { getPromotion, derivePromotionStatus } from "@/services/promotion.service";
import { Card, CardSection } from "@/components/ui/Card";
import { PromotionStatusBadge } from "@/components/admin/PromotionStatusBadge";
import { formatDateTime } from "@/utils/format-date";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value || "—"}</p>
    </div>
  );
}

export default async function PromotionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const promotion = await getPromotion(id);

  if (!promotion) {
    notFound();
  }

  const status = derivePromotionStatus(promotion);
  const revenueSaved = promotion.redemptions.reduce((sum, r) => sum + Number(r.discountAmount), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/promotions" className="text-sm text-emerald-700 hover:underline">
          ← Back to promotions
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">{promotion.name}</h1>
          <PromotionStatusBadge status={status} />
        </div>
        {promotion.requiresCode && <p className="text-sm text-slate-500">Code: {promotion.code}</p>}
      </div>

      <Card>
        <CardSection title="Configuration">
          <Detail label="Discount Type" value={promotion.discountType} />
          <Detail
            label="Value"
            value={
              promotion.discountType === "BOGO"
                ? `Buy ${promotion.buyQuantity} Get ${promotion.freeQuantity} Free`
                : promotion.discountType === "PERCENT"
                  ? `${promotion.value ? Number(promotion.value) : 0}%`
                  : String(promotion.value ? Number(promotion.value) : 0)
            }
          />
          <Detail label="Priority" value={String(promotion.priority)} />
          <Detail label="Stackable" value={promotion.isStackable ? "Yes" : "No"} />
          <Detail label="Usage" value={`${promotion.usageCount}${promotion.usageLimit != null ? ` / ${promotion.usageLimit}` : " (unlimited)"}`} />
          <Detail label="Usage Per User" value={promotion.usageLimitPerUser != null ? String(promotion.usageLimitPerUser) : "Unlimited"} />
          <Detail label="Start Date" value={promotion.startDate ? formatDateTime(promotion.startDate) : "—"} />
          <Detail label="End Date" value={promotion.endDate ? formatDateTime(promotion.endDate) : "—"} />
          <Detail label="Applicable Programs" value={promotion.programs.length > 0 ? promotion.programs.map((p) => p.program.name).join(", ") : "All programs"} />
          <Detail label="Applicable Sessions" value={promotion.sessions.length > 0 ? promotion.sessions.map((s) => s.session.name).join(", ") : "All sessions"} />
        </CardSection>
      </Card>

      <Card>
        <CardSection title="Usage &amp; Revenue">
          <Detail label="Total Redemptions" value={String(promotion._count.redemptions)} />
          <Detail label="Revenue Saved (recent 20 shown)" value={revenueSaved.toLocaleString()} />
        </CardSection>
      </Card>

      <Card className="overflow-x-auto p-0">
        <div className="p-6 pb-0">
          <h2 className="text-base font-semibold text-slate-900">Recent Redemptions</h2>
        </div>
        <table className="mt-4 min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Date", "User Email", "Discount Amount", "Free Count"].map((header) => (
                <th key={header} className="px-4 py-3 text-left font-semibold text-slate-600">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {promotion.redemptions.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(r.createdAt)}</td>
                <td className="px-4 py-3 text-slate-700">{r.userEmail}</td>
                <td className="px-4 py-3 text-slate-700">{Number(r.discountAmount).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-700">{r.freeCount ?? "—"}</td>
              </tr>
            ))}
            {promotion.redemptions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No redemptions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card className="overflow-x-auto p-0">
        <div className="p-6 pb-0">
          <h2 className="text-base font-semibold text-slate-900">Recent Admin Activity</h2>
        </div>
        <table className="mt-4 min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Date", "Action", "Admin"].map((header) => (
                <th key={header} className="px-4 py-3 text-left font-semibold text-slate-600">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {promotion.auditLogs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(log.createdAt)}</td>
                <td className="px-4 py-3 text-slate-700">{log.action}</td>
                <td className="px-4 py-3 text-slate-700">{log.adminEmail ?? "—"}</td>
              </tr>
            ))}
            {promotion.auditLogs.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                  No activity recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
