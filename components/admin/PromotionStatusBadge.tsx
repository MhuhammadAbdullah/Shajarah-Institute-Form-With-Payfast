import type { PromotionStatus } from "@/services/promotion.service";

const STATUS_STYLES: Record<PromotionStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-500",
  SCHEDULED: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  EXPIRED: "bg-red-100 text-red-700",
  DISABLED: "bg-slate-100 text-slate-400",
};

const STATUS_LABELS: Record<PromotionStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  DISABLED: "Disabled",
};

export function PromotionStatusBadge({ status }: { status: PromotionStatus }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</span>;
}
