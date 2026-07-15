import type { PaymentStatus } from "@prisma/client";
import { cn } from "@/utils/cn";

const STATUS_STYLES: Record<PaymentStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  FAILED: "bg-red-50 text-red-700 ring-red-600/20",
  CANCELLED: "bg-slate-100 text-slate-600 ring-slate-500/20",
  REFUNDED: "bg-sky-50 text-sky-700 ring-sky-600/20",
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export function StatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        STATUS_STYLES[status],
        className,
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  );
}
