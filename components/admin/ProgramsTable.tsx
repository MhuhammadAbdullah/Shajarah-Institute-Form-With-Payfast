"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgramForm, type OptionRow } from "@/components/admin/ProgramForm";
import { ToggleActiveButton } from "@/components/admin/ToggleActiveButton";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { SortableHeader } from "@/components/admin/SortableHeader";
import { BulkActionsBar } from "@/components/admin/BulkActionsBar";
import { Pagination } from "@/components/admin/Pagination";
import { useRowSelection } from "@/components/admin/useRowSelection";
import { toggleProgramAction, deleteProgramAction, bulkSetProgramsActiveAction, bulkDeleteProgramsAction } from "@/actions/cms.actions";

interface ProgramRow {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  displayOrder: number;
  isActive: boolean;
}

interface ProgramAssociation {
  programId: string;
  campusIds: string[];
  sessionIds: string[];
}

export function ProgramsTable({
  programs,
  associations,
  campuses,
  sessions,
  search,
  status,
  sort,
  dir,
  page,
  totalPages,
}: {
  programs: ProgramRow[];
  associations: ProgramAssociation[];
  campuses: OptionRow[];
  sessions: OptionRow[];
  search: string;
  status: string;
  sort?: string;
  dir?: "asc" | "desc";
  page: number;
  totalPages: number;
}) {
  const associationsByProgram = useMemo(() => new Map(associations.map((a) => [a.programId, a])), [associations]);
  const ids = useMemo(() => programs.map((p) => p.id), [programs]);
  const selection = useRowSelection(ids);

  return (
    <div className="flex flex-col gap-3">
      <BulkActionsBar
        selectedIds={selection.selectedArray}
        onActivate={(bulkIds) => bulkSetProgramsActiveAction(bulkIds, true)}
        onDeactivate={(bulkIds) => bulkSetProgramsActiveAction(bulkIds, false)}
        onDelete={bulkDeleteProgramsAction}
        onDone={selection.clear}
        itemLabelPlural="programs"
      />

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selection.allSelected}
                  onChange={selection.toggleAll}
                  aria-label="Select all programs"
                />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                <SortableHeader label="Name" sortKey="name" basePath="/admin/programs" currentSort={sort} currentDir={dir} search={search} status={status} />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Description</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {programs.map((program) => (
              <tr key={program.id} className={selection.isSelected(program.id) ? "bg-emerald-50/50" : undefined}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selection.isSelected(program.id)}
                    onChange={() => selection.toggle(program.id)}
                    aria-label={`Select ${program.name}`}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{program.name}</td>
                <td className="px-4 py-3 text-slate-600">{program.description ?? "—"}</td>
                <td className="px-4 py-3">
                  <ToggleActiveButton id={program.id} isActive={program.isActive} toggleAction={toggleProgramAction} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <ProgramForm
                      program={program}
                      trigger="edit"
                      campuses={campuses}
                      sessions={sessions}
                      selectedCampusIds={associationsByProgram.get(program.id)?.campusIds}
                      selectedSessionIds={associationsByProgram.get(program.id)?.sessionIds}
                    />
                    <DeleteButton
                      action={deleteProgramAction}
                      id={program.id}
                      title="Delete program?"
                      message={`This will permanently delete "${program.name}". This action cannot be undone.`}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {programs.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    title="No programs found"
                    description={search || status !== "all" ? "Try adjusting your search or filters." : "Add your first program to get started."}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination basePath="/admin/programs" page={page} totalPages={totalPages} search={search} status={status} sort={sort} dir={dir} />
      </Card>
    </div>
  );
}
