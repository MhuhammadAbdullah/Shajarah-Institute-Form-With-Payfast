"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PromotionForm, type PromotionRow } from "@/components/admin/PromotionForm";
import { PromotionStatusBadge } from "@/components/admin/PromotionStatusBadge";
import { type OptionRow } from "@/components/admin/ProgramForm";
import { ToggleActiveButton } from "@/components/admin/ToggleActiveButton";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { SortableHeader } from "@/components/admin/SortableHeader";
import { BulkActionsBar } from "@/components/admin/BulkActionsBar";
import { Pagination } from "@/components/admin/Pagination";
import { useRowSelection } from "@/components/admin/useRowSelection";
import type { PromotionStatus } from "@/services/promotion.service";
import {
  togglePromotionAction,
  deletePromotionAction,
  duplicatePromotionAction,
  bulkSetPromotionsActiveAction,
  bulkDeletePromotionsAction,
} from "@/actions/promotion.actions";

const DISCOUNT_LABELS: Record<PromotionRow["discountType"], string> = {
  PERCENT: "Percentage",
  FIXED: "Fixed Amount",
  BOGO: "Buy X Get Y Free",
};

function DuplicateButton({ id }: { id: string }) {
  return (
    <form action={duplicatePromotionAction}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-sm font-medium text-slate-600 hover:underline">
        Duplicate
      </button>
    </form>
  );
}

function discountSummary(row: PromotionRow): string {
  if (row.discountType === "BOGO") return `Buy ${row.buyQuantity} Get ${row.freeQuantity} Free`;
  if (row.discountType === "PERCENT") return `${row.value ? Number(row.value) : 0}% off`;
  return `${row.value ? Number(row.value).toLocaleString() : 0} off`;
}

export function PromotionsTable({
  promotions,
  statuses,
  programs,
  sessions,
  search,
  status,
  sort,
  dir,
  page,
  totalPages,
}: {
  promotions: PromotionRow[];
  statuses: Record<string, PromotionStatus>;
  programs: OptionRow[];
  sessions: OptionRow[];
  search: string;
  status: string;
  sort?: string;
  dir?: "asc" | "desc";
  page: number;
  totalPages: number;
}) {
  const ids = useMemo(() => promotions.map((p) => p.id), [promotions]);
  const selection = useRowSelection(ids);

  return (
    <div className="flex flex-col gap-3">
      <BulkActionsBar
        selectedIds={selection.selectedArray}
        onActivate={(bulkIds) => bulkSetPromotionsActiveAction(bulkIds, true)}
        onDeactivate={(bulkIds) => bulkSetPromotionsActiveAction(bulkIds, false)}
        onDelete={bulkDeletePromotionsAction}
        onDone={selection.clear}
        itemLabelPlural="promotions"
      />

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-10 px-4 py-3">
                <input type="checkbox" checked={selection.allSelected} onChange={selection.toggleAll} aria-label="Select all promotions" />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                <SortableHeader label="Name" sortKey="name" basePath="/admin/promotions" currentSort={sort} currentDir={dir} search={search} status={status} />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Code</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                <SortableHeader label="Usage" sortKey="usageCount" basePath="/admin/promotions" currentSort={sort} currentDir={dir} search={search} status={status} />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                <SortableHeader label="Priority" sortKey="priority" basePath="/admin/promotions" currentSort={sort} currentDir={dir} search={search} status={status} />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Featured</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {promotions.map((promo) => (
              <tr key={promo.id} className={selection.isSelected(promo.id) ? "bg-emerald-50/50" : undefined}>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selection.isSelected(promo.id)} onChange={() => selection.toggle(promo.id)} aria-label={`Select ${promo.name}`} />
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{promo.name}</p>
                  <p className="text-xs text-slate-500">{discountSummary(promo)}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{DISCOUNT_LABELS[promo.discountType]}</td>
                <td className="px-4 py-3">
                  {promo.requiresCode ? (
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">{promo.code}</span>
                  ) : (
                    <span className="text-xs text-slate-400">Automatic</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <PromotionStatusBadge status={statuses[promo.id]} />
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {promo.usageCount}
                  {promo.usageLimit != null ? ` / ${promo.usageLimit}` : ""}
                </td>
                <td className="px-4 py-3 text-slate-700">{promo.priority}</td>
                <td className="px-4 py-3">{promo.isFeatured ? "⭐" : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <ToggleActiveButton id={promo.id} isActive={promo.isActive} toggleAction={togglePromotionAction} />
                    <PromotionForm programs={programs} sessions={sessions} promotion={promo} trigger="edit" />
                    <DuplicateButton id={promo.id} />
                    <DeleteButton
                      action={deletePromotionAction}
                      id={promo.id}
                      title="Delete promotion?"
                      message={`This will permanently delete "${promo.name}". Promotions that have already been used by a registration can't be deleted - disable them instead.`}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {promotions.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <EmptyState
                    title="No promotions found"
                    description={search || status !== "all" ? "Try adjusting your search or filters." : "Create your first promotion to get started."}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination basePath="/admin/promotions" page={page} totalPages={totalPages} search={search} status={status} sort={sort} dir={dir} />
      </Card>
    </div>
  );
}
