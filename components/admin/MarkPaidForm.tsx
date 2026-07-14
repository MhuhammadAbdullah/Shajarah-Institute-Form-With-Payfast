"use client";

import { useActionState } from "react";
import { markRegistrationPaidAction, type MarkPaidState } from "@/actions/admin-registrations.actions";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: MarkPaidState = {};

export function MarkPaidForm({ registrationId }: { registrationId: string }) {
  const [state, formAction, isPending] = useActionState(markRegistrationPaidAction, initialState);

  if (state.success) {
    return (
      <p className="text-sm font-medium text-emerald-700">
        Marked as paid. Refresh the page to see the updated status and payment history.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="registrationId" value={registrationId} />

      <p className="text-sm text-slate-500">
        Use this only when PayFast confirmed the payment (e.g. on the customer&apos;s success redirect) but never sent
        the server-to-server IPN, so the automated flow never marked it paid. This is logged against your admin
        account.
      </p>

      <Field label="PayFast Transaction ID" htmlFor="transactionId">
        <Input id="transactionId" name="transactionId" required placeholder="e.g. ff85c764-35a2-25f8-207b-e971c65d09d5" />
      </Field>

      <Field label="Note (why this is being marked paid manually)" htmlFor="note">
        <Textarea id="note" name="note" required rows={3} placeholder="e.g. Confirmed via PayFast success redirect and merchant dashboard, IPN never arrived." />
      </Field>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <Button type="submit" variant="secondary" loading={isPending} className="self-start">
        Mark as Paid
      </Button>
    </form>
  );
}
