"use client";

import { useMemo } from "react";
import type { DiscountType } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeeStructureForm } from "@/components/admin/FeeStructureForm";
import { type OptionRow } from "@/components/admin/ProgramForm";
import { ToggleActiveButton } from "@/components/admin/ToggleActiveButton";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { SortableHeader } from "@/components/admin/SortableHeader";
import { BulkActionsBar } from "@/components/admin/BulkActionsBar";
import { Pagination } from "@/components/admin/Pagination";
import { useRowSelection } from "@/components/admin/useRowSelection";
import { toggleFeeStructureAction, deleteFeeStructureAction, bulkSetFeeStructuresActiveAction, bulkDeleteFeeStructuresAction } from "@/actions/feeStructure.actions";

interface FeeStructureRow {
  id: string;
  programId: string;
  campusId: string;
  sessionId: string;
  program: { name: string };
  campus: { name: string };
  session: { name: string };
  currency: string;
  fee: string;
  registrationFee: string | null;
  discountAmount: string | null;
  discountPercent: string | null;
  isActive: boolean;
  discountRules: { id: string; minQuantity: number; discountType: DiscountType; value: string; isActive: boolean }[];
}

export function FeeStructuresTable({
  feeStructures,
  programs,
  campuses,
  sessions,
  search,
  status,
  sort,
  dir,
  page,
  totalPages,
}: {
  feeStructures: FeeStructureRow[];
  programs: OptionRow[];
  campuses: OptionRow[];
  sessions: OptionRow[];
  search: string;
  status: string;
  sort?: string;
  dir?: "asc" | "desc";
  page: number;
  totalPages: number;
}) {
  const ids = useMemo(() => feeStructures.map((fs) => fs.id), [feeStructures]);
  const selection = useRowSelection(ids);

  return (
    <div className="flex flex-col gap-3">
      <BulkActionsBar
        selectedIds={selection.selectedArray}
        onActivate={(bulkIds) => bulkSetFeeStructuresActiveAction(bulkIds, true)}
        onDeactivate={(bulkIds) => bulkSetFeeStructuresActiveAction(bulkIds, false)}
        onDelete={bulkDeleteFeeStructuresAction}
        onDone={selection.clear}
        itemLabelPlural="fee structures"
      />

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-10 px-4 py-3">
                <input type="checkbox" checked={selection.allSelected} onChange={selection.toggleAll} aria-label="Select all fee structures" />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                <SortableHeader label="Program" sortKey="program" basePath="/admin/fee-structures" currentSort={sort} currentDir={dir} search={search} status={status} />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                <SortableHeader label="Campus" sortKey="campus" basePath="/admin/fee-structures" currentSort={sort} currentDir={dir} search={search} status={status} />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                <SortableHeader label="Session" sortKey="session" basePath="/admin/fee-structures" currentSort={sort} currentDir={dir} search={search} status={status} />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                <SortableHeader label="Fee" sortKey="fee" basePath="/admin/fee-structures" currentSort={sort} currentDir={dir} search={search} status={status} />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Reg. Fee</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Discount</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {feeStructures.map((fs) => (
              <tr key={fs.id} className={selection.isSelected(fs.id) ? "bg-emerald-50/50" : undefined}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selection.isSelected(fs.id)}
                    onChange={() => selection.toggle(fs.id)}
                    aria-label={`Select ${fs.program.name} — ${fs.campus.name} — ${fs.session.name}`}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{fs.program.name}</td>
                <td className="px-4 py-3 text-slate-600">{fs.campus.name}</td>
                <td className="px-4 py-3 text-slate-600">{fs.session.name}</td>
                <td className="px-4 py-3 text-slate-700">
                  {fs.currency} {Number(fs.fee).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-slate-700">{fs.registrationFee ? Number(fs.registrationFee).toLocaleString() : "—"}</td>
                <td className="px-4 py-3 text-slate-700">
                  {fs.discountAmount ? `${Number(fs.discountAmount).toLocaleString()} off` : fs.discountPercent ? `${Number(fs.discountPercent)}% off` : "—"}
                </td>
                <td className="px-4 py-3">
                  <ToggleActiveButton id={fs.id} isActive={fs.isActive} toggleAction={toggleFeeStructureAction} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <FeeStructureForm
                      programs={programs}
                      campuses={campuses}
                      sessions={sessions}
                      feeStructure={{
                        id: fs.id,
                        programId: fs.programId,
                        campusId: fs.campusId,
                        sessionId: fs.sessionId,
                        currency: fs.currency,
                        fee: fs.fee,
                        registrationFee: fs.registrationFee,
                        discountAmount: fs.discountAmount,
                        discountPercent: fs.discountPercent,
                      }}
                      trigger="edit"
                    />
                    <DeleteButton
                      action={deleteFeeStructureAction}
                      id={fs.id}
                      title="Delete fee structure?"
                      message={`This will permanently delete the fee structure for "${fs.program.name} — ${fs.campus.name} — ${fs.session.name}", including its discount tiers. This action cannot be undone.`}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {feeStructures.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <EmptyState
                    title="No fee structures found"
                    description={search || status !== "all" ? "Try adjusting your search or filters." : "Add your first fee structure to get started."}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination basePath="/admin/fee-structures" page={page} totalPages={totalPages} search={search} status={status} sort={sort} dir={dir} />
      </Card>
    </div>
  );
}
