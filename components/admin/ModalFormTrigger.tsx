"use client";

import { useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export function ModalFormTrigger({
  triggerLabel,
  triggerVariant = "primary",
  title,
  widthClassName,
  children,
}: {
  triggerLabel: string;
  triggerVariant?: "primary" | "ghost";
  title: string;
  widthClassName?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      {triggerVariant === "ghost" ? (
        <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium text-emerald-700 hover:underline">
          {triggerLabel}
        </button>
      ) : (
        <Button type="button" onClick={() => setOpen(true)}>
          {triggerLabel}
        </Button>
      )}
      <Modal open={open} onClose={close} title={title} widthClassName={widthClassName}>
        {children(close)}
      </Modal>
    </>
  );
}
