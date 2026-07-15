"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SessionForm } from "@/components/admin/SessionForm";
import { ToggleActiveButton } from "@/components/admin/ToggleActiveButton";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { SortableHeader } from "@/components/admin/SortableHeader";
import { BulkActionsBar } from "@/components/admin/BulkActionsBar";
import { Pagination } from "@/components/admin/Pagination";
import { useRowSelection } from "@/components/admin/useRowSelection";
import { toggleSessionAction, deleteSessionAction, bulkSetSessionsActiveAction, bulkDeleteSessionsAction } from "@/actions/cms.actions";
import { formatDate } from "@/utils/format-date";

interface SessionRow {
  id: string;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  displayOrder: number;
  isActive: boolean;
}

export function SessionsTable({
  sessions,
  search,
  status,
  sort,
  dir,
  page,
  totalPages,
}: {
  sessions: SessionRow[];
  search: string;
  status: string;
  sort?: string;
  dir?: "asc" | "desc";
  page: number;
  totalPages: number;
}) {
  const ids = useMemo(() => sessions.map((s) => s.id), [sessions]);
  const selection = useRowSelection(ids);

  return (
    <div className="flex flex-col gap-3">
      <BulkActionsBar
        selectedIds={selection.selectedArray}
        onActivate={(bulkIds) => bulkSetSessionsActiveAction(bulkIds, true)}
        onDeactivate={(bulkIds) => bulkSetSessionsActiveAction(bulkIds, false)}
        onDelete={bulkDeleteSessionsAction}
        onDone={selection.clear}
        itemLabelPlural="sessions"
      />

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-10 px-4 py-3">
                <input type="checkbox" checked={selection.allSelected} onChange={selection.toggleAll} aria-label="Select all sessions" />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                <SortableHeader label="Name" sortKey="name" basePath="/admin/sessions" currentSort={sort} currentDir={dir} search={search} status={status} />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                <SortableHeader label="Start" sortKey="startDate" basePath="/admin/sessions" currentSort={sort} currentDir={dir} search={search} status={status} />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                <SortableHeader label="End" sortKey="endDate" basePath="/admin/sessions" currentSort={sort} currentDir={dir} search={search} status={status} />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sessions.map((session) => (
              <tr key={session.id} className={selection.isSelected(session.id) ? "bg-emerald-50/50" : undefined}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selection.isSelected(session.id)}
                    onChange={() => selection.toggle(session.id)}
                    aria-label={`Select ${session.name}`}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{session.name}</td>
                <td className="px-4 py-3 text-slate-600">{session.startDate ? formatDate(session.startDate) : "—"}</td>
                <td className="px-4 py-3 text-slate-600">{session.endDate ? formatDate(session.endDate) : "—"}</td>
                <td className="px-4 py-3">
                  <ToggleActiveButton id={session.id} isActive={session.isActive} toggleAction={toggleSessionAction} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <SessionForm session={session} trigger="edit" />
                    <DeleteButton
                      action={deleteSessionAction}
                      id={session.id}
                      title="Delete session?"
                      message={`This will permanently delete "${session.name}". This action cannot be undone.`}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    title="No sessions found"
                    description={search || status !== "all" ? "Try adjusting your search or filters." : "Add your first session to get started."}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination basePath="/admin/sessions" page={page} totalPages={totalPages} search={search} status={status} sort={sort} dir={dir} />
      </Card>
    </div>
  );
}
