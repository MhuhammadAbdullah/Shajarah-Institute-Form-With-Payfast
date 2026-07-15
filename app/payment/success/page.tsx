import { Card } from "@/components/ui/Card";
import { SuccessDetails } from "@/components/registration/SuccessDetails";
import { SuccessCheckmark } from "@/components/registration/SuccessCheckmark";

export const metadata = {
  title: "Payment Received — Shajarah Institute",
};

export default function PaymentSuccessPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-16">
      <Card className="max-w-md text-center">
        <SuccessCheckmark />
        <h1 className="text-xl font-semibold text-slate-900 print:hidden">Payment Received</h1>
        <p className="mt-2 text-sm text-slate-500 print:hidden">
          Thank you! We&apos;ve received your payment submission. Your registration will be confirmed once PayFast
          finalizes the transaction, and you&apos;ll receive an email confirmation shortly.
        </p>

        <SuccessDetails />

        <a
          href="https://shajarah.org/"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 print:hidden"
        >
          Back to Home
        </a>
      </Card>
    </div>
  );
}
