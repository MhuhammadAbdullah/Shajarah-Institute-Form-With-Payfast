import { listFeeStructures, listFeeStructuresPaginated, FEE_STRUCTURE_SORT_KEYS, type FeeStructureSortKey } from "@/services/feeStructure.service";
import { listPrograms } from "@/services/program.service";
import { listCampuses } from "@/services/campus.service";
import { listSessions } from "@/services/session.service";
import { Card, CardSection } from "@/components/ui/Card";
import { FeeStructureForm } from "@/components/admin/FeeStructureForm";
import { FeeStructuresTable } from "@/components/admin/FeeStructuresTable";
import { DiscountRuleEditor } from "@/components/admin/DiscountRuleEditor";
import { ListToolbar } from "@/components/admin/ListToolbar";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string; sort?: string; dir?: string }>;
}

export default async function AdminFeeStructuresPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search ?? "";
  const status = params.status === "active" || params.status === "inactive" ? params.status : "all";
  const page = params.page ? Number(params.page) : 1;
  const sort = FEE_STRUCTURE_SORT_KEYS.includes(params.sort as FeeStructureSortKey) ? (params.sort as FeeStructureSortKey) : undefined;
  const dir = params.dir === "desc" ? "desc" : params.dir === "asc" ? "asc" : undefined;

  const [{ items: feeStructures, total, totalPages }, allFeeStructures, programs, campuses, sessions] = await Promise.all([
    listFeeStructuresPaginated({ search, status, page, sort, dir }),
    listFeeStructures(),
    listPrograms(),
    listCampuses(),
    listSessions(),
  ]);

  const feeStructureRows = feeStructures.map((fs) => ({
    id: fs.id,
    programId: fs.programId,
    campusId: fs.campusId,
    sessionId: fs.sessionId,
    program: { name: fs.program.name },
    campus: { name: fs.campus.name },
    session: { name: fs.session.name },
    currency: fs.currency,
    fee: fs.fee.toString(),
    registrationFee: fs.registrationFee?.toString() ?? null,
    discountAmount: fs.discountAmount?.toString() ?? null,
    discountPercent: fs.discountPercent?.toString() ?? null,
    isActive: fs.isActive,
    discountRules: fs.discountRules.map((r) => ({
      id: r.id,
      minQuantity: r.minQuantity,
      discountType: r.discountType,
      value: r.value.toString(),
      isActive: r.isActive,
    })),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Fee Structures</h1>
          <p className="text-sm text-slate-500">
            {total} fee structures — the registration form displays the fee for the exact Program + Campus + Session
            combination selected, with any quantity discount tiers applied automatically.
          </p>
        </div>
        <FeeStructureForm programs={programs} campuses={campuses} sessions={sessions} trigger="create" />
      </div>

      <ListToolbar
        basePath="/admin/fee-structures"
        search={search}
        status={status}
        sort={sort}
        dir={dir}
        searchPlaceholder="Search by program, campus, or session…"
        statusOptions={[
          { value: "all", label: "All" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
      />

      <FeeStructuresTable
        feeStructures={feeStructureRows}
        programs={programs}
        campuses={campuses}
        sessions={sessions}
        search={search}
        status={status}
        sort={sort}
        dir={dir}
        page={page}
        totalPages={totalPages}
      />

      <Card>
        <CardSection title="Quantity Discount Tiers" description="Bulk-registration discounts per Fee Structure (e.g. 2 registrants = 10% off).">
          <div className="sm:col-span-2 flex flex-col gap-4">
            {allFeeStructures.map((fs) => (
              <DiscountRuleEditor
                key={fs.id}
                feeStructureId={fs.id}
                label={`${fs.program.name} — ${fs.campus.name} — ${fs.session.name}`}
                rules={fs.discountRules.map((r) => ({
                  id: r.id,
                  minQuantity: r.minQuantity,
                  discountType: r.discountType,
                  value: r.value.toString(),
                  isActive: r.isActive,
                }))}
              />
            ))}
            {allFeeStructures.length === 0 && <p className="text-sm text-slate-500">Add a Fee Structure first.</p>}
          </div>
        </CardSection>
      </Card>
    </div>
  );
}
