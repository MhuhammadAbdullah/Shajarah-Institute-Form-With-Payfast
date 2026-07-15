"use client";

import { useEffect, useState } from "react";
import { LAST_BASKET_ID_KEY } from "@/components/registration/DynamicRegistrationForm";

interface StatusData {
  basketId: string;
  paymentStatus: string;
  transactionId: string | null;
  paymentMethod: string | null;
  fee: number;
}

export function SuccessDetails() {
  const [status, setStatus] = useState<StatusData | null>(null);

  useEffect(() => {
    const basketId = window.sessionStorage.getItem(LAST_BASKET_ID_KEY);
    if (!basketId) return;

    fetch(`/api/registration/status?basketId=${encodeURIComponent(basketId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStatus(data);
      })
      .catch(() => setStatus(null));
  }, []);

  if (!status) return null;

  return (
    <div className="mt-6 flex flex-col gap-4 print:mt-4">
      <div id="registration-receipt" className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-left">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Registration Receipt</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-slate-400">Registration ID</dt>
            <dd className="font-mono font-medium text-slate-900">{status.basketId}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Payment Status</dt>
            <dd className="font-medium text-slate-900">{status.paymentStatus}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Transaction ID</dt>
            <dd className="font-mono font-medium text-slate-900">{status.transactionId ?? "Pending"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Amount</dt>
            <dd className="font-medium text-slate-900">PKR {status.fee.toLocaleString()}</dd>
          </div>
        </dl>
      </div>
      <button
        type="button"
        onClick={() => window.print()}
        className="self-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 print:hidden"
      >
        Print / Download Receipt
      </button>
    </div>
  );
}
