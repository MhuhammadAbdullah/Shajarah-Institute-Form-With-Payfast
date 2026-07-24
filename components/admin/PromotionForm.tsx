"use client";

import { useActionState, useEffect, useState } from "react";
import { savePromotionAction, type PromotionFormState } from "@/actions/promotion.actions";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ModalFormTrigger } from "@/components/admin/ModalFormTrigger";
import { type OptionRow } from "@/components/admin/ProgramForm";

export interface PromotionRow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  usageCount: number;
  requiresCode: boolean;
  code: string | null;
  publicTitle: string | null;
  subtitle: string | null;
  bannerText: string | null;
  discountType: "PERCENT" | "FIXED" | "BOGO";
  value: string | null;
  maxDiscountAmount: string | null;
  buyQuantity: number | null;
  freeQuantity: number | null;
  startDate: string | null;
  endDate: string | null;
  priority: number;
  isStackable: boolean;
  allowBogoStacking: boolean;
  usageLimit: number | null;
  usageLimitPerUser: number | null;
  minOrderAmount: string | null;
  minRegistrationCount: number | null;
  showOnForm: boolean;
  isFeatured: boolean;
  bannerColor: string | null;
  bannerIcon: string | null;
  displayOrder: number;
  programIds: string[];
  sessionIds: string[];
}

interface PromotionFormProps {
  programs: OptionRow[];
  sessions: OptionRow[];
  promotion?: PromotionRow;
  trigger: "create" | "edit";
}

function dateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function FormBody({
  programs,
  sessions,
  promotion,
  onSaved,
}: Omit<PromotionFormProps, "trigger"> & { onSaved: () => void }) {
  const [state, formAction, isPending] = useActionState<PromotionFormState, FormData>(savePromotionAction, {});
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED" | "BOGO">(promotion?.discountType ?? "PERCENT");
  const [requiresCode, setRequiresCode] = useState(promotion?.requiresCode ?? false);

  useEffect(() => {
    if (state.success) onSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  const idSuffix = promotion?.id ?? "new";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {promotion && <input type="hidden" name="id" value={promotion.id} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Discount Name" htmlFor={`promo-name-${idSuffix}`} helpText="Internal - not shown to customers.">
          <Input id={`promo-name-${idSuffix}`} name="name" defaultValue={promotion?.name} required />
        </Field>
        <Field label="Priority" htmlFor={`promo-priority-${idSuffix}`} helpText="Higher number wins when multiple promotions qualify.">
          <Input id={`promo-priority-${idSuffix}`} name="priority" type="number" step="1" defaultValue={promotion?.priority ?? 0} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Internal Description" htmlFor={`promo-desc-${idSuffix}`} optional>
            <Textarea id={`promo-desc-${idSuffix}`} name="description" rows={2} defaultValue={promotion?.description ?? ""} />
          </Field>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <p className="mb-3 text-sm font-medium text-slate-900">Public-facing (banner &amp; review step)</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Public Promotion Title" htmlFor={`promo-title-${idSuffix}`} optional>
            <Input id={`promo-title-${idSuffix}`} name="publicTitle" defaultValue={promotion?.publicTitle ?? ""} placeholder="Early Bird Offer" />
          </Field>
          <Field label="Promotion Subtitle" htmlFor={`promo-subtitle-${idSuffix}`} optional>
            <Input id={`promo-subtitle-${idSuffix}`} name="subtitle" defaultValue={promotion?.subtitle ?? ""} placeholder="Get 20% OFF" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Promotion Banner Text" htmlFor={`promo-banner-text-${idSuffix}`} optional>
              <Input
                id={`promo-banner-text-${idSuffix}`}
                name="bannerText"
                defaultValue={promotion?.bannerText ?? ""}
                placeholder="🎉 Early Bird – Get 20% OFF"
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <p className="mb-3 text-sm font-medium text-slate-900">Discount type &amp; value</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Discount Type" htmlFor={`promo-type-${idSuffix}`}>
            <Select
              id={`promo-type-${idSuffix}`}
              name="discountType"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as typeof discountType)}
            >
              <option value="PERCENT">Percentage</option>
              <option value="FIXED">Fixed Amount</option>
              <option value="BOGO">Buy X Get Y Free</option>
            </Select>
          </Field>
          <div className="flex items-end pb-2.5">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="requiresCode"
                checked={requiresCode}
                onChange={(e) => setRequiresCode(e.target.checked)}
              />
              Requires a coupon code
            </label>
          </div>

          {requiresCode && (
            <div className="sm:col-span-2">
              <Field label="Coupon Code" htmlFor={`promo-code-${idSuffix}`} helpText="Stored uppercase, e.g. WELCOME10.">
                <Input id={`promo-code-${idSuffix}`} name="code" defaultValue={promotion?.code ?? ""} placeholder="WELCOME10" className="uppercase" />
              </Field>
            </div>
          )}

          {discountType === "BOGO" ? (
            <>
              <Field label="Buy Quantity" htmlFor={`promo-buyqty-${idSuffix}`}>
                <Input id={`promo-buyqty-${idSuffix}`} name="buyQuantity" type="number" min="1" step="1" defaultValue={promotion?.buyQuantity ?? ""} required />
              </Field>
              <Field label="Free Quantity" htmlFor={`promo-freeqty-${idSuffix}`}>
                <Input id={`promo-freeqty-${idSuffix}`} name="freeQuantity" type="number" min="1" step="1" defaultValue={promotion?.freeQuantity ?? ""} required />
              </Field>
            </>
          ) : (
            <Field label={discountType === "PERCENT" ? "Discount Percent" : "Discount Amount"} htmlFor={`promo-value-${idSuffix}`}>
              <Input
                id={`promo-value-${idSuffix}`}
                name="value"
                type="number"
                min="0"
                max={discountType === "PERCENT" ? "100" : undefined}
                step="0.01"
                defaultValue={promotion?.value ?? ""}
                required
              />
            </Field>
          )}

          <Field label="Maximum Discount Amount" htmlFor={`promo-maxdisc-${idSuffix}`} optional helpText="Caps the discount, mainly useful for percentages.">
            <Input id={`promo-maxdisc-${idSuffix}`} name="maxDiscountAmount" type="number" min="0" step="0.01" defaultValue={promotion?.maxDiscountAmount ?? ""} />
          </Field>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <p className="mb-3 text-sm font-medium text-slate-900">Scheduling &amp; priority</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Start Date" htmlFor={`promo-start-${idSuffix}`} optional>
            <Input id={`promo-start-${idSuffix}`} name="startDate" type="date" defaultValue={dateInputValue(promotion?.startDate ?? null)} />
          </Field>
          <Field label="End Date" htmlFor={`promo-end-${idSuffix}`} optional>
            <Input id={`promo-end-${idSuffix}`} name="endDate" type="date" defaultValue={dateInputValue(promotion?.endDate ?? null)} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="isStackable" defaultChecked={promotion?.isStackable ?? false} />
            Stackable with other promotions
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="allowBogoStacking" defaultChecked={promotion?.allowBogoStacking ?? false} />
            Allow stacking with another Buy X Get Y Free
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <p className="mb-3 text-sm font-medium text-slate-900">Usage limits &amp; eligibility</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Usage Limit" htmlFor={`promo-usagelimit-${idSuffix}`} optional helpText="Total redemptions across all customers.">
            <Input id={`promo-usagelimit-${idSuffix}`} name="usageLimit" type="number" min="0" step="1" defaultValue={promotion?.usageLimit ?? ""} />
          </Field>
          <Field label="Usage Per User" htmlFor={`promo-usageperuser-${idSuffix}`} optional>
            <Input id={`promo-usageperuser-${idSuffix}`} name="usageLimitPerUser" type="number" min="0" step="1" defaultValue={promotion?.usageLimitPerUser ?? ""} />
          </Field>
          <Field label="Minimum Registration Count" htmlFor={`promo-minreg-${idSuffix}`} optional>
            <Input id={`promo-minreg-${idSuffix}`} name="minRegistrationCount" type="number" min="0" step="1" defaultValue={promotion?.minRegistrationCount ?? ""} />
          </Field>
          <Field label="Minimum Order Value" htmlFor={`promo-minorder-${idSuffix}`} optional>
            <Input id={`promo-minorder-${idSuffix}`} name="minOrderAmount" type="number" min="0" step="0.01" defaultValue={promotion?.minOrderAmount ?? ""} />
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Applicable Programs</p>
            <p className="mb-1.5 text-xs text-slate-400">None checked = applies to all programs.</p>
            <div className="flex max-h-32 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {programs.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="programIds" value={p.id} defaultChecked={promotion?.programIds.includes(p.id) ?? false} />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Applicable Sessions</p>
            <p className="mb-1.5 text-xs text-slate-400">None checked = applies to all sessions.</p>
            <div className="flex max-h-32 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {sessions.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="sessionIds" value={s.id} defaultChecked={promotion?.sessionIds.includes(s.id) ?? false} />
                  {s.name}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <p className="mb-3 text-sm font-medium text-slate-900">Banner &amp; display</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="showOnForm" defaultChecked={promotion?.showOnForm ?? true} />
            Show promotion on registration form
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="isFeatured" defaultChecked={promotion?.isFeatured ?? false} />
            Highlight as featured promotion
          </label>
          <Field label="Banner Color" htmlFor={`promo-color-${idSuffix}`} optional helpText="e.g. emerald, amber, rose.">
            <Input id={`promo-color-${idSuffix}`} name="bannerColor" defaultValue={promotion?.bannerColor ?? ""} />
          </Field>
          <Field label="Banner Icon" htmlFor={`promo-icon-${idSuffix}`} optional helpText="A single emoji, e.g. 🎉">
            <Input id={`promo-icon-${idSuffix}`} name="bannerIcon" defaultValue={promotion?.bannerIcon ?? ""} />
          </Field>
          <Field label="Display Order" htmlFor={`promo-order-${idSuffix}`}>
            <Input id={`promo-order-${idSuffix}`} name="displayOrder" type="number" step="1" defaultValue={promotion?.displayOrder ?? 0} />
          </Field>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <div>
        <Button type="submit" variant={promotion ? "secondary" : "primary"} loading={isPending}>
          {promotion ? "Save Changes" : "Create Promotion"}
        </Button>
      </div>
    </form>
  );
}

export function PromotionForm({ trigger, ...rest }: PromotionFormProps) {
  const isEdit = trigger === "edit";

  return (
    <ModalFormTrigger
      triggerLabel={isEdit ? "Edit" : "Create Promotion"}
      triggerVariant={isEdit ? "ghost" : "primary"}
      title={isEdit ? "Edit Promotion" : "Create Promotion"}
      widthClassName="max-w-3xl"
    >
      {(close) => <FormBody {...rest} onSaved={close} />}
    </ModalFormTrigger>
  );
}
