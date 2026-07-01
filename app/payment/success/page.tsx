import Link from "next/link";
import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "Payment Received — Shajarah Institute",
};

export default function PaymentSuccessPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-16">
      <Card className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-7 w-7 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Payment Received</h1>
        <p className="mt-2 text-sm text-slate-500">
          Thank you! We&apos;ve received your payment submission. Your registration will be confirmed once PayFast
          finalizes the transaction, and you&apos;ll receive an email confirmation shortly.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Back to Home
        </Link>
      </Card>
    </div>
  );
}
