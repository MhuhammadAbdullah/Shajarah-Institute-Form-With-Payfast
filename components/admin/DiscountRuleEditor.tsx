"use client";

import { useActionState } from "react";
import {
  saveDiscountRuleAction,
  deleteDiscountRuleAction,
  toggleDiscountRuleAction,
  type DiscountRuleFormState,
} from "@/actions/feeStructure.actions";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";

interface DiscountRule {
  id: string;
  minQuantity: number;
  discountType: "PERCENT" | "FIXED";
  value: string;
  isActive: boolean;
}

function AddDiscountRuleForm({ feeStructureId }: { feeStructureId: string }) {
  const [state, formAction, isPending] = useActionState<DiscountRuleFormState, FormData>(saveDiscountRuleAction, {});

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="feeStructureId" value={feeStructureId} />
      <div className="flex w-24 flex-col gap-1">
        <label className="text-xs text-slate-500">Min Quantity</label>
        <Input name="minQuantity" type="number" min="1" step="1" uiSize="sm" required />
      </div>
      <div className="flex w-28 flex-col gap-1">
        <label className="text-xs text-slate-500">Type</label>
        <Select name="discountType" defaultValue="PERCENT" uiSize="sm">
          <option value="PERCENT">Percent</option>
          <option value="FIXED">Fixed</option>
        </Select>
      </div>
      <div className="flex w-24 flex-col gap-1">
        <label className="text-xs text-slate-500">Value</label>
        <Input name="value" type="number" min="0" step="0.01" uiSize="sm" required />
      </div>
      <Button type="submit" variant="secondary" size="sm" loading={isPending}>
        Add Tier
      </Button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

export function DiscountRuleEditor({
  feeStructureId,
  label,
  rules,
}: {
  feeStructureId: string;
  label: string;
  rules: DiscountRule[];
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="mb-2 text-sm font-medium text-slate-900">{label}</p>
      <div className="flex flex-col gap-2">
        {rules.map((rule) => (
          <div key={rule.id} className="flex items-center gap-3 text-sm text-slate-700">
            <span className="w-32">Qty ≥ {rule.minQuantity}</span>
            <span className="w-40">
              {rule.discountType === "PERCENT" ? `${Number(rule.value)}% off` : `${Number(rule.value).toLocaleString()} off`}
            </span>
            <form action={toggleDiscountRuleAction}>
              <input type="hidden" name="id" value={rule.id} />
              <button
                type="submit"
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  rule.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                }`}
              >
                {rule.isActive ? "Active" : "Inactive"}
              </button>
            </form>
            <DeleteButton
              action={deleteDiscountRuleAction}
              id={rule.id}
              title="Remove discount tier?"
              message={`This will permanently remove the "Qty ≥ ${rule.minQuantity}" discount tier. This action cannot be undone.`}
            />
          </div>
        ))}
        {rules.length === 0 && <p className="text-xs text-slate-400">No discount tiers - full price at any quantity.</p>}
      </div>
      <div className="mt-3">
        <AddDiscountRuleForm feeStructureId={feeStructureId} />
      </div>
    </div>
  );
}
