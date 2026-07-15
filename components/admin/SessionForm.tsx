"use client";

import { useActionState, useEffect } from "react";
import { saveSessionAction, type CmsFormState } from "@/actions/cms.actions";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ModalFormTrigger } from "@/components/admin/ModalFormTrigger";

interface Session {
  id: string;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  displayOrder: number;
}

function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

function FormBody({ session, onSaved }: { session?: Session; onSaved: () => void }) {
  const [state, formAction, isPending] = useActionState<CmsFormState, FormData>(saveSessionAction, {});

  useEffect(() => {
    if (state.success) onSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {session && <input type="hidden" name="id" value={session.id} />}
      <Field label="Session Name" htmlFor={`session-name-${session?.id ?? "new"}`}>
        <Input id={`session-name-${session?.id ?? "new"}`} name="name" required defaultValue={session?.name} />
      </Field>
      <Field label="Start Date" htmlFor={`session-start-${session?.id ?? "new"}`} optional>
        <Input
          id={`session-start-${session?.id ?? "new"}`}
          name="startDate"
          type="date"
          defaultValue={toDateInputValue(session?.startDate ?? null)}
        />
      </Field>
      <Field label="End Date" htmlFor={`session-end-${session?.id ?? "new"}`} optional>
        <Input
          id={`session-end-${session?.id ?? "new"}`}
          name="endDate"
          type="date"
          defaultValue={toDateInputValue(session?.endDate ?? null)}
        />
      </Field>
      <Field label="Display Order" htmlFor={`session-order-${session?.id ?? "new"}`} optional helpText="Lower numbers appear first on the registration form. Leave blank to add at the end.">
        <Input id={`session-order-${session?.id ?? "new"}`} name="displayOrder" type="number" step="1" defaultValue={session?.displayOrder} />
      </Field>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <Button type="submit" variant={session ? "secondary" : "primary"} loading={isPending} className="self-start">
        {session ? "Save Changes" : "Add Session"}
      </Button>
    </form>
  );
}

export function SessionForm({ session, trigger }: { session?: Session; trigger: "create" | "edit" }) {
  const isEdit = trigger === "edit";

  return (
    <ModalFormTrigger
      triggerLabel={isEdit ? "Edit" : "Add Session"}
      triggerVariant={isEdit ? "ghost" : "primary"}
      title={isEdit ? "Edit Session" : "Add Session"}
      widthClassName="max-w-md"
    >
      {(close) => <FormBody session={session} onSaved={close} />}
    </ModalFormTrigger>
  );
}
