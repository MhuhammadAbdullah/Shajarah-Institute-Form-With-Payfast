"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export interface BulkDeleteResult {
  deletedCount: number;
  failedCount: number;
}

export function BulkActionsBar({
  selectedIds,
  onActivate,
  onDeactivate,
  onDelete,
  onDone,
  itemLabelPlural,
}: {
  selectedIds: string[];
  onActivate: (ids: string[]) => Promise<void>;
  onDeactivate: (ids: string[]) => Promise<void>;
  onDelete: (ids: string[]) => Promise<BulkDeleteResult>;
  onDone: () => void;
  itemLabelPlural: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteResult, setDeleteResult] = useState<BulkDeleteResult | null>(null);

  if (selectedIds.length === 0) return null;

  function handleActivate() {
    startTransition(async () => {
      await onActivate(selectedIds);
      onDone();
    });
  }

  function handleDeactivate() {
    startTransition(async () => {
      await onDeactivate(selectedIds);
      onDone();
    });
  }

  function handleDeleteConfirm() {
    startTransition(async () => {
      const result = await onDelete(selectedIds);
      setDeleteResult(result);
    });
  }

  function closeConfirm() {
    const hadResult = deleteResult !== null;
    setConfirmOpen(false);
    setDeleteResult(null);
    if (hadResult) onDone();
  }

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
      <span className="font-medium">{selectedIds.length} selected</span>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={handleActivate} loading={isPending}>
          Activate
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={handleDeactivate} loading={isPending}>
          Deactivate
        </Button>
        <Button type="button" variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
          Delete
        </Button>
      </div>

      <Modal open={confirmOpen} onClose={closeConfirm} title={`Delete ${selectedIds.length} ${itemLabelPlural}?`} widthClassName="max-w-sm">
        {deleteResult ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-600">
              {deleteResult.deletedCount} deleted.
              {deleteResult.failedCount > 0 &&
                ` ${deleteResult.failedCount} could not be deleted because other records still reference them.`}
            </p>
            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={closeConfirm}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-600">
              This will permanently delete {selectedIds.length} {itemLabelPlural}. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" loading={isPending} onClick={handleDeleteConfirm}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
