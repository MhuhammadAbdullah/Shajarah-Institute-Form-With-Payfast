import { listCampusesPaginated, CAMPUS_SORT_KEYS, type CampusSortKey } from "@/services/campus.service";
import { CampusForm } from "@/components/admin/CampusForm";
import { CampusesTable } from "@/components/admin/CampusesTable";
import { ListToolbar } from "@/components/admin/ListToolbar";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string; sort?: string; dir?: string }>;
}

export default async function AdminCampusesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search ?? "";
  const status = params.status === "active" || params.status === "inactive" ? params.status : "all";
  const page = params.page ? Number(params.page) : 1;
  const sort = CAMPUS_SORT_KEYS.includes(params.sort as CampusSortKey) ? (params.sort as CampusSortKey) : undefined;
  const dir = params.dir === "desc" ? "desc" : params.dir === "asc" ? "asc" : undefined;

  const { items: campuses, total, totalPages } = await listCampusesPaginated({ search, status, page, sort, dir });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Campuses</h1>
          <p className="text-sm text-slate-500">{total} campuses — manage what students can select.</p>
        </div>
        <CampusForm trigger="create" />
      </div>

      <ListToolbar
        basePath="/admin/campuses"
        search={search}
        status={status}
        sort={sort}
        dir={dir}
        searchPlaceholder="Search by campus name…"
        statusOptions={[
          { value: "all", label: "All" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
      />

      <CampusesTable campuses={campuses} search={search} status={status} sort={sort} dir={dir} page={page} totalPages={totalPages} />
    </div>
  );
}
