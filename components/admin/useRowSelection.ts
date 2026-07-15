"use client";

import { useMemo, useState } from "react";

export function useRowSelection(allIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  function isSelected(id: string) {
    return selectedIds.has(id);
  }

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) => {
      const allCurrentlySelected = allIds.length > 0 && allIds.every((id) => prev.has(id));
      return allCurrentlySelected ? new Set() : new Set(allIds);
    });
  }

  function clear() {
    setSelectedIds(new Set());
  }

  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds]);

  return { selectedIds, selectedArray, isSelected, toggle, toggleAll, clear, allSelected };
}
