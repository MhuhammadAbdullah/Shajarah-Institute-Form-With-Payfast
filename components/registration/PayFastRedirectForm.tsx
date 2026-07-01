"use client";

import { useEffect, useRef } from "react";
import type { CheckoutFields } from "@/types/registration";

/**
 * Renders a hidden HTML form pre-filled with the PayFast hosted checkout
 * fields and auto-submits it, taking the customer to PayFast to complete
 * payment. A real <form> POST (not fetch/redirect) is required because
 * PayFast expects the browser to land on its hosted page directly.
 */
export function PayFastRedirectForm({ checkoutUrl, fields }: { checkoutUrl: string; fields: CheckoutFields }) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.submit();
  }, []);

  return (
    <form ref={formRef} method="POST" action={checkoutUrl} className="hidden">
      {Object.entries(fields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
    </form>
  );
}
