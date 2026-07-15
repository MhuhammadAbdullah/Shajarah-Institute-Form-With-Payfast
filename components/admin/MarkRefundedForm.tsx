"use client";

import { useActionState } from "react";
import { markRegistrationRefundedAction, type MarkRefundedState } from "@/actions/admin-registrations.actions";
import { Textarea } from "@/components/ui/Textarea";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: MarkRefundedState = {};

export function MarkRefundedForm({ registrationId }: { registrationId: string }) {
  const [state, formAction, isPending] = useActionState(markRegistrationRefundedAction, initialState);

  if (state.success) {
    return <p className="text-sm font-medium text-sky-700">Marked as refunded. Refresh the page to see the updated status.</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="registrationId" value={registrationId} />

      <Field label="Note (reason for the refund)" htmlFor="refundNote">
        <Textarea id="refundNote" name="note" required rows={3} placeholder="e.g. Student withdrew before batch start, refunded via bank transfer on 15 Jul." />
      </Field>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <Button type="submit" variant="secondary" loading={isPending} className="self-start">
        Mark as Refunded
      </Button>
    </form>
  );
}
