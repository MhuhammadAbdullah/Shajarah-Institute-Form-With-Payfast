"use client";

import { useActionState, useEffect } from "react";
import { saveCampusAction, type CmsFormState } from "@/actions/cms.actions";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ModalFormTrigger } from "@/components/admin/ModalFormTrigger";

interface Campus {
  id: string;
  name: string;
  address: string | null;
  displayOrder: number;
}

function FormBody({ campus, onSaved }: { campus?: Campus; onSaved: () => void }) {
  const [state, formAction, isPending] = useActionState<CmsFormState, FormData>(saveCampusAction, {});

  useEffect(() => {
    if (state.success) onSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {campus && <input type="hidden" name="id" value={campus.id} />}
      <Field label="Campus Name" htmlFor={`campus-name-${campus?.id ?? "new"}`}>
        <Input id={`campus-name-${campus?.id ?? "new"}`} name="name" required defaultValue={campus?.name} />
      </Field>
      <Field label="Address" htmlFor={`campus-address-${campus?.id ?? "new"}`} optional>
        <Textarea id={`campus-address-${campus?.id ?? "new"}`} name="address" rows={2} defaultValue={campus?.address ?? ""} />
      </Field>
      <Field label="Display Order" htmlFor={`campus-order-${campus?.id ?? "new"}`} optional helpText="Lower numbers appear first on the registration form. Leave blank to add at the end.">
        <Input id={`campus-order-${campus?.id ?? "new"}`} name="displayOrder" type="number" step="1" defaultValue={campus?.displayOrder} />
      </Field>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <Button type="submit" variant={campus ? "secondary" : "primary"} loading={isPending} className="self-start">
        {campus ? "Save Changes" : "Add Campus"}
      </Button>
    </form>
  );
}

export function CampusForm({ campus, trigger }: { campus?: Campus; trigger: "create" | "edit" }) {
  const isEdit = trigger === "edit";

  return (
    <ModalFormTrigger
      triggerLabel={isEdit ? "Edit" : "Add Campus"}
      triggerVariant={isEdit ? "ghost" : "primary"}
      title={isEdit ? "Edit Campus" : "Add Campus"}
      widthClassName="max-w-md"
    >
      {(close) => <FormBody campus={campus} onSaved={close} />}
    </ModalFormTrigger>
  );
}
