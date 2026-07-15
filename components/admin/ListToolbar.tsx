import Link from "next/link";

export interface StatusOption {
  value: string;
  label: string;
}

export function ListToolbar({
  basePath,
  search,
  status,
  sort,
  dir,
  statusOptions,
  searchPlaceholder = "Search…",
}: {
  basePath: string;
  search?: string;
  status?: string;
  sort?: string;
  dir?: "asc" | "desc";
  statusOptions: StatusOption[];
  searchPlaceholder?: string;
}) {
  function hrefFor(nextStatus: string) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (nextStatus !== "all") params.set("status", nextStatus);
    if (sort) params.set("sort", sort);
    if (dir) params.set("dir", dir);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <form method="GET" action={basePath} className="flex w-full max-w-sm gap-2">
        {status && status !== "all" && <input type="hidden" name="status" value={status} />}
        {sort && <input type="hidden" name="sort" value={sort} />}
        {dir && <input type="hidden" name="dir" value={dir} />}
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder={searchPlaceholder}
          className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />
        <button type="submit" className="shrink-0 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
          Search
        </button>
      </form>

      {statusOptions.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          {statusOptions.map((opt) => {
            const active = (status ?? "all") === opt.value;
            return (
              <Link
                key={opt.value}
                href={hrefFor(opt.value)}
                className={`rounded-full px-3 py-1.5 font-medium ${active ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {opt.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
