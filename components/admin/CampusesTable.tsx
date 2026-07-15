"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CampusForm } from "@/components/admin/CampusForm";
import { ToggleActiveButton } from "@/components/admin/ToggleActiveButton";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { SortableHeader } from "@/components/admin/SortableHeader";
import { BulkActionsBar } from "@/components/admin/BulkActionsBar";
import { Pagination } from "@/components/admin/Pagination";
import { useRowSelection } from "@/components/admin/useRowSelection";
import { toggleCampusAction, deleteCampusAction, bulkSetCampusesActiveAction, bulkDeleteCampusesAction } from "@/actions/cms.actions";

interface CampusRow {
  id: string;
  name: string;
  address: string | null;
  displayOrder: number;
  isActive: boolean;
}

export function CampusesTable({
  campuses,
  search,
  status,
  sort,
  dir,
  page,
  totalPages,
}: {
  campuses: CampusRow[];
  search: string;
  status: string;
  sort?: string;
  dir?: "asc" | "desc";
  page: number;
  totalPages: number;
}) {
  const ids = useMemo(() => campuses.map((c) => c.id), [campuses]);
  const selection = useRowSelection(ids);

  return (
    <div className="flex flex-col gap-3">
      <BulkActionsBar
        selectedIds={selection.selectedArray}
        onActivate={(bulkIds) => bulkSetCampusesActiveAction(bulkIds, true)}
        onDeactivate={(bulkIds) => bulkSetCampusesActiveAction(bulkIds, false)}
        onDelete={bulkDeleteCampusesAction}
        onDone={selection.clear}
        itemLabelPlural="campuses"
      />

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-10 px-4 py-3">
                <input type="checkbox" checked={selection.allSelected} onChange={selection.toggleAll} aria-label="Select all campuses" />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                <SortableHeader label="Name" sortKey="name" basePath="/admin/campuses" currentSort={sort} currentDir={dir} search={search} status={status} />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Address</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {campuses.map((campus) => (
              <tr key={campus.id} className={selection.isSelected(campus.id) ? "bg-emerald-50/50" : undefined}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selection.isSelected(campus.id)}
                    onChange={() => selection.toggle(campus.id)}
                    aria-label={`Select ${campus.name}`}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{campus.name}</td>
                <td className="px-4 py-3 text-slate-600">{campus.address ?? "—"}</td>
                <td className="px-4 py-3">
                  <ToggleActiveButton id={campus.id} isActive={campus.isActive} toggleAction={toggleCampusAction} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <CampusForm campus={campus} trigger="edit" />
                    <DeleteButton
                      action={deleteCampusAction}
                      id={campus.id}
                      title="Delete campus?"
                      message={`This will permanently delete "${campus.name}". This action cannot be undone.`}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {campuses.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    title="No campuses found"
                    description={search || status !== "all" ? "Try adjusting your search or filters." : "Add your first campus to get started."}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination basePath="/admin/campuses" page={page} totalPages={totalPages} search={search} status={status} sort={sort} dir={dir} />
      </Card>
    </div>
  );
}
