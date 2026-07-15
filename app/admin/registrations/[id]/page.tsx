import { notFound } from "next/navigation";
import Link from "next/link";
import { getRegistrationDetail } from "@/services/admin.service";
import { listAllCustomFieldDefinitions } from "@/services/formBuilder.service";
import { Card, CardSection } from "@/components/ui/Card";
import { MarkPaidForm } from "@/components/admin/MarkPaidForm";
import { MarkRefundedForm } from "@/components/admin/MarkRefundedForm";
import { RetrySheetSyncButton } from "@/components/admin/RetrySheetSyncButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCalendarDate, formatDateTime } from "@/utils/format-date";

function formatCustomValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  return String(value);
}

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
  const [registration, customFieldDefs] = await Promise.all([getRegistrationDetail(id), listAllCustomFieldDefinitions()]);

  if (!registration) {
    notFound();
  }

  const customFieldValues = (registration.customFieldValues as Record<string, unknown>) ?? {};
  const knownKeys = new Set(customFieldDefs.map((f) => f.key));
  const orphanedEntries = Object.entries(customFieldValues).filter(([key, value]) => !knownKeys.has(key) && value !== null && value !== undefined && value !== "");

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
            value={registration.dateOfBirth ? formatCalendarDate(registration.dateOfBirth) : ""}
          />
          <Detail label="Registration Type" value={registration.registrationType === "MULTIPLE" ? "Multiple" : "Single"} />
        </CardSection>
      </Card>

      {registration.registrationType === "MULTIPLE" && registration.participants.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <div className="p-6 pb-0">
            <h2 className="text-base font-semibold text-slate-900">Participants ({registration.participants.length})</h2>
          </div>
          <table className="mt-4 min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["#", "Full Name", "Email", "Phone", "CNIC", "Age"].map((header) => (
                  <th key={header} className="px-4 py-3 text-left font-semibold text-slate-600">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registration.participants.map((participant, index) => (
                <tr key={participant.id}>
                  <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{participant.fullName}</td>
                  <td className="px-4 py-3 text-slate-700">{participant.email}</td>
                  <td className="px-4 py-3 text-slate-700">{participant.phone}</td>
                  <td className="px-4 py-3 text-slate-700">{participant.cnic}</td>
                  <td className="px-4 py-3 text-slate-700">{participant.age}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card>
        <CardSection title="Program Information">
          <Detail label="Program" value={registration.program} />
          <Detail label="Campus" value={registration.campus} />
          <Detail label="Session" value={registration.session} />
          <Detail label="Fee" value={Number(registration.fee).toLocaleString()} />
        </CardSection>
      </Card>

      <Card>
        <CardSection title="Address">
          <Detail label="Country" value={registration.country} />
          <Detail label="Province/State" value={registration.province ?? ""} />
          <Detail label="City" value={registration.city} />
          <Detail label="Postal Code" value={registration.postalCode ?? ""} />
          <Detail label="Address" value={registration.address} />
        </CardSection>
      </Card>

      <Card>
        <CardSection title="Payment Status">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
            <div className="mt-1">
              <StatusBadge status={registration.paymentStatus} />
            </div>
          </div>
          <Detail label="Payment Method" value={registration.paymentMethod ?? ""} />
          <Detail label="Transaction ID" value={registration.transactionId ?? ""} />
        </CardSection>
        {registration.paymentStatus !== "PAID" && registration.paymentStatus !== "REFUNDED" && (
          <CardSection title="Manual Override">
            <div className="sm:col-span-2">
              <MarkPaidForm registrationId={registration.id} />
            </div>
          </CardSection>
        )}
        {registration.paymentStatus === "PAID" && (
          <CardSection title="Refund">
            <div className="sm:col-span-2">
              <MarkRefundedForm registrationId={registration.id} />
            </div>
          </CardSection>
        )}
      </Card>

      {registration.paymentStatus === "PAID" && (
        <Card>
          <CardSection title="Google Sheets Sync">
            <Detail
              label="Status"
              value={
                registration.sheetSyncError
                  ? "Failed"
                  : registration.sheetSyncedAt
                    ? "Synced"
                    : "Pending"
              }
            />
            <Detail
              label="Last Synced"
              value={registration.sheetSyncedAt ? formatDateTime(registration.sheetSyncedAt) : ""}
            />
            {registration.sheetSyncError && (
              <div className="sm:col-span-2">
                <Detail label="Error" value={registration.sheetSyncError} />
              </div>
            )}
            <div className="sm:col-span-2">
              <RetrySheetSyncButton registrationId={registration.id} />
            </div>
          </CardSection>
        </Card>
      )}

      {(customFieldDefs.some((f) => customFieldValues[f.key] !== undefined && customFieldValues[f.key] !== null && customFieldValues[f.key] !== "") ||
        orphanedEntries.length > 0) && (
        <Card>
          <CardSection title="Additional Information" description="Fields added via the Form Builder.">
            {customFieldDefs
              .filter((f) => customFieldValues[f.key] !== undefined && customFieldValues[f.key] !== null && customFieldValues[f.key] !== "")
              .map((f) => (
                <Detail key={f.id} label={f.label + (f.isActive ? "" : " (inactive field)")} value={formatCustomValue(customFieldValues[f.key])} />
              ))}
            {orphanedEntries.map(([key, value]) => (
              <Detail key={key} label={`${key} (removed field)`} value={formatCustomValue(value)} />
            ))}
          </CardSection>
        </Card>
      )}

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
                <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(payment.createdAt)}</td>
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
