import { listProgramsPaginated, PROGRAM_SORT_KEYS, type ProgramSortKey } from "@/services/program.service";
import { listCampuses } from "@/services/campus.service";
import { listSessions } from "@/services/session.service";
import { listCampusIdsForProgram } from "@/services/programCampus.service";
import { listSessionIdsForProgram } from "@/services/programSession.service";
import { ProgramForm } from "@/components/admin/ProgramForm";
import { ProgramsTable } from "@/components/admin/ProgramsTable";
import { ListToolbar } from "@/components/admin/ListToolbar";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string; sort?: string; dir?: string }>;
}

export default async function AdminProgramsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search ?? "";
  const status = params.status === "active" || params.status === "inactive" ? params.status : "all";
  const page = params.page ? Number(params.page) : 1;
  const sort = PROGRAM_SORT_KEYS.includes(params.sort as ProgramSortKey) ? (params.sort as ProgramSortKey) : undefined;
  const dir = params.dir === "desc" ? "desc" : params.dir === "asc" ? "asc" : undefined;

  const [{ items: programs, total, totalPages }, campuses, sessions] = await Promise.all([
    listProgramsPaginated({ search, status, page, sort, dir }),
    listCampuses(),
    listSessions(),
  ]);

  const associations = await Promise.all(
    programs.map(async (program) => ({
      programId: program.id,
      campusIds: await listCampusIdsForProgram(program.id),
      sessionIds: await listSessionIdsForProgram(program.id),
    })),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Programs</h1>
          <p className="text-sm text-slate-500">{total} programs — manage what students can register for.</p>
        </div>
        <ProgramForm trigger="create" campuses={campuses} sessions={sessions} />
      </div>

      <ListToolbar
        basePath="/admin/programs"
        search={search}
        status={status}
        sort={sort}
        dir={dir}
        searchPlaceholder="Search by program name…"
        statusOptions={[
          { value: "all", label: "All" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
      />

      <ProgramsTable
        programs={programs}
        associations={associations}
        campuses={campuses}
        sessions={sessions}
        search={search}
        status={status}
        sort={sort}
        dir={dir}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
