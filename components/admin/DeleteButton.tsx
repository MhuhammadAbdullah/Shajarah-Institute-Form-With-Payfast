"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { DeleteConfirmForm, type DeleteFormState } from "@/components/admin/DeleteConfirmForm";

export function DeleteButton({
  action,
  id,
  title,
  message,
}: {
  action: (prevState: DeleteFormState, formData: FormData) => Promise<DeleteFormState>;
  id: string;
  title: string;
  message: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium text-red-600 hover:underline">
        Delete
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} widthClassName="max-w-sm">
        <DeleteConfirmForm action={action} id={id} message={message} onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}
