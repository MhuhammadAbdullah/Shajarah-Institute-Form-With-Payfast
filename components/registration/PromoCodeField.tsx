"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { AppliedPromotion, CouponError } from "@/types/promotion";

interface PromoCodeFieldProps {
  appliedCode: string | null;
  couponError: CouponError | null;
  appliedPromotions: AppliedPromotion[];
  freeRegistrationCount: number;
  currency: string;
  loading: boolean;
  onApply: (code: string) => void;
  onRemove: () => void;
}

export function PromoCodeField({
  appliedCode,
  couponError,
  appliedPromotions,
  freeRegistrationCount,
  currency,
  loading,
  onApply,
  onRemove,
}: PromoCodeFieldProps) {
  const [input, setInput] = useState("");

  const matchingPromotion = appliedCode ? appliedPromotions.find((p) => p.code === appliedCode) : undefined;
  // While `loading` is true, `appliedPromotions`/`couponError` still reflect
  // the PREVIOUS fee-options response (appliedCode updates immediately on
  // Apply, but the fetch that actually validates it hasn't resolved yet) -
  // evaluating success/failure against that stale data is what caused the
  // code to briefly show "couldn't be applied" before flipping to applied.
  const checking = Boolean(appliedCode) && loading;
  const succeeded = Boolean(appliedCode) && !checking && !couponError && Boolean(matchingPromotion);

  function handleApply() {
    const trimmed = input.trim();
    if (!trimmed) return;
    onApply(trimmed);
  }

  function handleRemove() {
    setInput("");
    onRemove();
  }

  if (appliedCode) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-slate-700">Promo Code</p>
        {checking ? (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
            <p className="text-sm text-slate-500">Checking &quot;{appliedCode}&quot;…</p>
          </div>
        ) : succeeded ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                &quot;{appliedCode}&quot; applied — {currency} {matchingPromotion!.discountAmount.toLocaleString()} off
              </p>
              {freeRegistrationCount > 0 && (
                <p className="text-xs text-emerald-700">{freeRegistrationCount} registration(s) are free with this offer.</p>
              )}
            </div>
            <button type="button" onClick={handleRemove} className="text-sm font-medium text-emerald-700 underline">
              Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{couponError?.message ?? "This code couldn't be applied."}</p>
            <button type="button" onClick={handleRemove} className="text-sm font-medium text-red-700 underline">
              Remove
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-slate-700">Promo Code</p>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="Enter coupon code"
          className="uppercase"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleApply();
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={handleApply} loading={loading} disabled={!input.trim()}>
          Apply
        </Button>
      </div>
    </div>
  );
}
