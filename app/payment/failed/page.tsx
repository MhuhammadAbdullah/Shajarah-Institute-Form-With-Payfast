import Link from "next/link";
import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "Payment Failed — Shajarah Institute",
};

export default function PaymentFailedPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-16">
      <Card className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Payment Failed</h1>
        <p className="mt-2 text-sm text-slate-500">
          Unfortunately your payment could not be completed. No amount has been confirmed as paid. You can return to
          the registration form and try again.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Try Again
        </Link>
      </Card>
    </div>
  );
}
