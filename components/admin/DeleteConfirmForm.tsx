"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/Button";

export interface DeleteFormState {
  error?: string;
  success?: boolean;
}

export function DeleteConfirmForm({
  action,
  id,
  message,
  onClose,
}: {
  action: (prevState: DeleteFormState, formData: FormData) => Promise<DeleteFormState>;
  id: string;
  message: string;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState<DeleteFormState, FormData>(action, {});

  useEffect(() => {
    if (state.success) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-slate-600">{message}</p>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="danger" loading={isPending}>
          Delete
        </Button>
      </div>
    </form>
  );
}
