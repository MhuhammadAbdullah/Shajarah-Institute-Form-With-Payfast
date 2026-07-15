"use client";

import { useActionState, useEffect } from "react";
import { saveFeeStructureAction, type FeeStructureFormState } from "@/actions/feeStructure.actions";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ModalFormTrigger } from "@/components/admin/ModalFormTrigger";

interface Option {
  id: string;
  name: string;
}

interface FeeStructure {
  id: string;
  programId: string;
  campusId: string;
  sessionId: string;
  currency: string;
  fee: string;
  registrationFee: string | null;
  discountAmount: string | null;
  discountPercent: string | null;
}

interface FeeStructureFormProps {
  programs: Option[];
  campuses: Option[];
  sessions: Option[];
  feeStructure?: FeeStructure;
  trigger: "create" | "edit";
}

function FormBody({
  programs,
  campuses,
  sessions,
  feeStructure,
  onSaved,
}: Omit<FeeStructureFormProps, "trigger"> & { onSaved: () => void }) {
  const [state, formAction, isPending] = useActionState<FeeStructureFormState, FormData>(saveFeeStructureAction, {});

  useEffect(() => {
    if (state.success) onSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  const idSuffix = feeStructure?.id ?? "new";

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {feeStructure && <input type="hidden" name="id" value={feeStructure.id} />}

      <Field label="Program" htmlFor={`fee-program-${idSuffix}`}>
        <Select id={`fee-program-${idSuffix}`} name="programId" placeholder="Select program" defaultValue={feeStructure?.programId}>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Campus" htmlFor={`fee-campus-${idSuffix}`}>
        <Select id={`fee-campus-${idSuffix}`} name="campusId" placeholder="Select campus" defaultValue={feeStructure?.campusId}>
          {campuses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Session" htmlFor={`fee-session-${idSuffix}`}>
        <Select id={`fee-session-${idSuffix}`} name="sessionId" placeholder="Select session" defaultValue={feeStructure?.sessionId}>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Currency" htmlFor={`fee-currency-${idSuffix}`}>
        <Input id={`fee-currency-${idSuffix}`} name="currency" defaultValue={feeStructure?.currency ?? "PKR"} />
      </Field>
      <Field label="Fee Amount" htmlFor={`fee-amount-${idSuffix}`}>
        <Input id={`fee-amount-${idSuffix}`} name="fee" type="number" step="0.01" min="0" defaultValue={feeStructure?.fee} required />
      </Field>
      <Field label="Registration Fee" htmlFor={`fee-regfee-${idSuffix}`} optional>
        <Input id={`fee-regfee-${idSuffix}`} name="registrationFee" type="number" step="0.01" min="0" defaultValue={feeStructure?.registrationFee ?? ""} />
      </Field>
      <Field label="Discount Amount" htmlFor={`fee-discamt-${idSuffix}`} optional>
        <Input id={`fee-discamt-${idSuffix}`} name="discountAmount" type="number" step="0.01" min="0" defaultValue={feeStructure?.discountAmount ?? ""} />
      </Field>
      <Field label="Discount Percent" htmlFor={`fee-discpct-${idSuffix}`} optional>
        <Input id={`fee-discpct-${idSuffix}`} name="discountPercent" type="number" step="0.01" min="0" max="100" defaultValue={feeStructure?.discountPercent ?? ""} />
      </Field>

      {state.error && (
        <p role="alert" className="text-sm text-red-600 sm:col-span-2">
          {state.error}
        </p>
      )}

      <div className="sm:col-span-2">
        <Button type="submit" variant={feeStructure ? "secondary" : "primary"} loading={isPending}>
          {feeStructure ? "Save Changes" : "Add Fee Structure"}
        </Button>
      </div>
    </form>
  );
}

export function FeeStructureForm({ trigger, ...rest }: FeeStructureFormProps) {
  const isEdit = trigger === "edit";

  return (
    <ModalFormTrigger
      triggerLabel={isEdit ? "Edit" : "Add Fee Structure"}
      triggerVariant={isEdit ? "ghost" : "primary"}
      title={isEdit ? "Edit Fee Structure" : "Add Fee Structure"}
      widthClassName="max-w-2xl"
    >
      {(close) => <FormBody {...rest} onSaved={close} />}
    </ModalFormTrigger>
  );
}
