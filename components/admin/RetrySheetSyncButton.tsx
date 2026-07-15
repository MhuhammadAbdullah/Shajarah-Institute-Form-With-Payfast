"use client";

import { useActionState } from "react";
import { retrySheetSyncAction, type RetrySheetSyncState } from "@/actions/admin-registrations.actions";
import { Button } from "@/components/ui/Button";

const initialState: RetrySheetSyncState = {};

export function RetrySheetSyncButton({ registrationId }: { registrationId: string }) {
  const [state, formAction, isPending] = useActionState(retrySheetSyncAction, initialState);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="registrationId" value={registrationId} />
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.success && <p className="text-sm text-emerald-700">Retry attempted - status refreshed below.</p>}
      <Button type="submit" variant="secondary" loading={isPending}>
        Retry Google Sheets Sync
      </Button>
    </form>
  );
}
