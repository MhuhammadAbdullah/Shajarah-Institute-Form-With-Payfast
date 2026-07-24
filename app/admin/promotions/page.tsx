import {
  listPromotionsPaginated,
  getPromotionStats,
  derivePromotionStatus,
  PROMOTION_SORT_KEYS,
  type PromotionSortKey,
  type PromotionListStatus,
} from "@/services/promotion.service";
import { listPrograms } from "@/services/program.service";
import { listSessions } from "@/services/session.service";
import { Card } from "@/components/ui/Card";
import { PromotionForm, type PromotionRow } from "@/components/admin/PromotionForm";
import { PromotionsTable } from "@/components/admin/PromotionsTable";
import { ListToolbar } from "@/components/admin/ListToolbar";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string; sort?: string; dir?: string }>;
}

const STATUS_OPTIONS: PromotionListStatus[] = ["all", "DRAFT", "SCHEDULED", "ACTIVE", "EXPIRED", "DISABLED"];

export default async function AdminPromotionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search ?? "";
  const status: PromotionListStatus = STATUS_OPTIONS.includes(params.status as PromotionListStatus)
    ? (params.status as PromotionListStatus)
    : "all";
  const page = params.page ? Number(params.page) : 1;
  const sort = PROMOTION_SORT_KEYS.includes(params.sort as PromotionSortKey) ? (params.sort as PromotionSortKey) : undefined;
  const dir = params.dir === "asc" ? "asc" : params.dir === "desc" ? "desc" : undefined;

  const [{ items: promotions, total, totalPages }, stats, programs, sessions] = await Promise.all([
    listPromotionsPaginated({ search, status, page, sort, dir }),
    getPromotionStats(),
    listPrograms(),
    listSessions(),
  ]);

  const now = new Date();
  const promotionRows: PromotionRow[] = promotions.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    isActive: p.isActive,
    usageCount: p.usageCount,
    requiresCode: p.requiresCode,
    code: p.code,
    publicTitle: p.publicTitle,
    subtitle: p.subtitle,
    bannerText: p.bannerText,
    discountType: p.discountType,
    value: p.value?.toString() ?? null,
    maxDiscountAmount: p.maxDiscountAmount?.toString() ?? null,
    buyQuantity: p.buyQuantity,
    freeQuantity: p.freeQuantity,
    startDate: p.startDate ? p.startDate.toISOString() : null,
    endDate: p.endDate ? p.endDate.toISOString() : null,
    priority: p.priority,
    isStackable: p.isStackable,
    allowBogoStacking: p.allowBogoStacking,
    usageLimit: p.usageLimit,
    usageLimitPerUser: p.usageLimitPerUser,
    minOrderAmount: p.minOrderAmount?.toString() ?? null,
    minRegistrationCount: p.minRegistrationCount,
    showOnForm: p.showOnForm,
    isFeatured: p.isFeatured,
    bannerColor: p.bannerColor,
    bannerIcon: p.bannerIcon,
    displayOrder: p.displayOrder,
    programIds: p.programs.map((pp) => pp.programId),
    sessionIds: p.sessions.map((ps) => ps.sessionId),
  }));

  const statuses = Object.fromEntries(promotions.map((p) => [p.id, derivePromotionStatus(p, now)]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Discounts &amp; Promotions</h1>
          <p className="text-sm text-slate-500">
            {total} promotions — automatic discounts, coupon codes, and Buy X Get Y Free offers, applied on top of any
            existing quantity discount tiers.
          </p>
        </div>
        <PromotionForm programs={programs} sessions={sessions} trigger="create" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="p-4">
          <p className="text-xs text-slate-500">Active</p>
          <p className="text-xl font-semibold text-emerald-700">{stats.active}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Scheduled</p>
          <p className="text-xl font-semibold text-amber-700">{stats.scheduled}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Draft</p>
          <p className="text-xl font-semibold text-slate-700">{stats.draft}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Expired</p>
          <p className="text-xl font-semibold text-red-700">{stats.expired}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Total Usage</p>
          <p className="text-xl font-semibold text-slate-900">{stats.totalUsage}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Revenue Saved</p>
          <p className="text-xl font-semibold text-slate-900">{stats.revenueSaved.toLocaleString()}</p>
        </Card>
      </div>

      <ListToolbar
        basePath="/admin/promotions"
        search={search}
        status={status}
        sort={sort}
        dir={dir}
        searchPlaceholder="Search by name, code, or title…"
        statusOptions={[
          { value: "all", label: "All" },
          { value: "DRAFT", label: "Draft" },
          { value: "SCHEDULED", label: "Scheduled" },
          { value: "ACTIVE", label: "Active" },
          { value: "EXPIRED", label: "Expired" },
          { value: "DISABLED", label: "Disabled" },
        ]}
      />

      <PromotionsTable
        promotions={promotionRows}
        statuses={statuses}
        programs={programs}
        sessions={sessions}
        search={search}
        status={status}
        sort={sort}
        dir={dir}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
