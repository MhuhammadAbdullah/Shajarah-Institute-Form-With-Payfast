import { listSessionsPaginated, SESSION_SORT_KEYS, type SessionSortKey } from "@/services/session.service";
import { SessionForm } from "@/components/admin/SessionForm";
import { SessionsTable } from "@/components/admin/SessionsTable";
import { ListToolbar } from "@/components/admin/ListToolbar";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string; sort?: string; dir?: string }>;
}

export default async function AdminSessionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search ?? "";
  const status = params.status === "active" || params.status === "inactive" ? params.status : "all";
  const page = params.page ? Number(params.page) : 1;
  const sort = SESSION_SORT_KEYS.includes(params.sort as SessionSortKey) ? (params.sort as SessionSortKey) : undefined;
  const dir = params.dir === "desc" ? "desc" : params.dir === "asc" ? "asc" : undefined;

  const { items: sessions, total, totalPages } = await listSessionsPaginated({ search, status, page, sort, dir });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Sessions</h1>
          <p className="text-sm text-slate-500">{total} sessions — manage the intakes students can select.</p>
        </div>
        <SessionForm trigger="create" />
      </div>

      <ListToolbar
        basePath="/admin/sessions"
        search={search}
        status={status}
        sort={sort}
        dir={dir}
        searchPlaceholder="Search by session name…"
        statusOptions={[
          { value: "all", label: "All" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
      />

      <SessionsTable sessions={sessions} search={search} status={status} sort={sort} dir={dir} page={page} totalPages={totalPages} />
    </div>
  );
}
