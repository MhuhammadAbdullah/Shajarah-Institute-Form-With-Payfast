"use client";

import type { PublicFormStep, PublicFormField } from "@/lib/formEngine/types";
import { Card, CardSection } from "@/components/ui/Card";

interface FeeDisplay {
  unitFee: number;
  quantity: number;
  subtotal: number;
  appliedRule: { minQuantity: number; discountType: "PERCENT" | "FIXED"; value: number } | null;
  discountAmount: number;
  totalFee: number;
  currency: string;
}

interface ReviewSummaryProps {
  steps: PublicFormStep[];
  values: Record<string, unknown>;
  onEditStep: (stepIndex: number) => void;
  feeDisplay: FeeDisplay | null;
}

function displayValue(field: PublicFormField, value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value
      .map((v) => field.options.find((o) => o.value === v)?.label ?? String(v))
      .join(", ");
  }
  const matchingOption = field.options.find((o) => o.value === value);
  return matchingOption ? matchingOption.label : String(value);
}

function isFieldVisible(field: PublicFormField, values: Record<string, unknown>): boolean {
  if (!field.dependsOnFieldKey) return true;
  const controllingValue = values[field.dependsOnFieldKey];
  const stringified = typeof controllingValue === "boolean" ? (controllingValue ? "true" : "false") : String(controllingValue ?? "");
  return stringified === field.dependsOnValue;
}

export function ReviewSummary({ steps, values, onEditStep, feeDisplay }: ReviewSummaryProps) {
  // Every step except the final "Review & Payment" step itself.
  const reviewableSteps = steps.slice(0, -1);

  return (
    <div className="flex flex-col gap-6">
      {reviewableSteps.map((step, stepIndex) => (
        <Card key={step.id}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
            <button type="button" onClick={() => onEditStep(stepIndex)} className="text-sm font-medium text-emerald-700 hover:underline">
              Edit
            </button>
          </div>
          {step.sections.map((section) => {
            const visibleFields = section.fields.filter((field) => isFieldVisible(field, values) && field.type !== "CHECKBOX");
            if (visibleFields.length === 0) return null;
            return (
              <div key={section.id} className="mb-4 last:mb-0">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{section.title}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {visibleFields.map((field) => (
                    <div key={field.id}>
                      <p className="text-xs uppercase tracking-wide text-slate-400">{field.label}</p>
                      <p className="text-sm font-medium text-slate-900">{displayValue(field, values[field.key])}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </Card>
      ))}

      <Card>
        <CardSection title="Fee Breakdown">
          {feeDisplay ? (
            <>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Base Fee × Quantity</p>
                <p className="text-sm font-medium text-slate-900">
                  {feeDisplay.currency} {feeDisplay.unitFee.toLocaleString()} × {feeDisplay.quantity} = {feeDisplay.currency}{" "}
                  {feeDisplay.subtotal.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Discount</p>
                <p className="text-sm font-medium text-slate-900">
                  {feeDisplay.appliedRule
                    ? feeDisplay.appliedRule.discountType === "PERCENT"
                      ? `${feeDisplay.appliedRule.value}% off (${feeDisplay.currency} ${feeDisplay.discountAmount.toLocaleString()})`
                      : `${feeDisplay.currency} ${feeDisplay.discountAmount.toLocaleString()} off`
                    : "—"}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">Total Amount Payable</p>
                <p className="text-lg font-semibold text-emerald-700">
                  {feeDisplay.currency} {feeDisplay.totalFee.toLocaleString()}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500 sm:col-span-2">Select a program, campus, and session to see the fee.</p>
          )}
        </CardSection>
      </Card>
    </div>
  );
}
