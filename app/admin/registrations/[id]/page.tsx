import { notFound } from "next/navigation";
import Link from "next/link";
import { getRegistrationDetail } from "@/services/admin.service";
import { Card, CardSection } from "@/components/ui/Card";
import { MarkPaidForm } from "@/components/admin/MarkPaidForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value || "—"}</p>
    </div>
  );
}

export default async function RegistrationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const registration = await getRegistrationDetail(id);

  if (!registration) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/registrations" className="text-sm text-emerald-700 hover:underline">
          ← Back to registrations
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">{registration.studentName}</h1>
        <p className="text-sm text-slate-500">Basket ID: {registration.basketId}</p>
      </div>

      <Card>
        <CardSection title="Student Information">
          <Detail label="Full Name" value={registration.studentName} />
          <Detail label="Father Name" value={registration.fatherName ?? ""} />
          <Detail label="Email" value={registration.email} />
          <Detail label="Phone" value={registration.phone} />
          <Detail label="CNIC" value={registration.cnic ?? ""} />
          <Detail label="Gender" value={registration.gender} />
          <Detail
            label="Date of Birth"
            value={registration.dateOfBirth ? new Intl.DateTimeFormat("en-PK").format(registration.dateOfBirth) : ""}
          />
        </CardSection>
      </Card>

      <Card>
        <CardSection title="Program Information">
          <Detail label="Program" value={registration.program} />
          <Detail label="Batch" value={registration.batch} />
          <Detail label="Campus" value={registration.campus} />
          <Detail label="Session" value={registration.session} />
          <Detail label="Fee" value={Number(registration.fee).toLocaleString()} />
        </CardSection>
      </Card>

      <Card>
        <CardSection title="Address">
          <Detail label="Country" value={registration.country} />
          <Detail label="City" value={registration.city} />
          <Detail label="Address" value={registration.address} />
        </CardSection>
      </Card>

      <Card>
        <CardSection title="Payment Status">
          <Detail label="Status" value={registration.paymentStatus} />
          <Detail label="Payment Method" value={registration.paymentMethod ?? ""} />
          <Detail label="Transaction ID" value={registration.transactionId ?? ""} />
        </CardSection>
        {registration.paymentStatus !== "PAID" && (
          <CardSection title="Manual Override">
            <div className="sm:col-span-2">
              <MarkPaidForm registrationId={registration.id} />
            </div>
          </CardSection>
        )}
      </Card>

      <Card className="overflow-x-auto p-0">
        <div className="p-6 pb-0">
          <h2 className="text-base font-semibold text-slate-900">Payment History</h2>
        </div>
        <table className="mt-4 min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Date", "Transaction ID", "Amount", "Err Code", "Status", "Message"].map((header) => (
                <th key={header} className="px-4 py-3 text-left font-semibold text-slate-600">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {registration.payments.map((payment) => (
              <tr key={payment.id}>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" }).format(payment.createdAt)}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{payment.transactionId ?? "—"}</td>
                <td className="px-4 py-3 text-slate-700">{Number(payment.amount).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-700">{payment.errCode ?? "—"}</td>
                <td className="px-4 py-3 text-slate-700">{payment.status}</td>
                <td className="px-4 py-3 text-slate-500">{payment.errMessage ?? "—"}</td>
              </tr>
            ))}
            {registration.payments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No payment attempts recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
