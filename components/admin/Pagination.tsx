import Link from "next/link";

export function Pagination({
  basePath,
  page,
  totalPages,
  search,
  status,
  sort,
  dir,
}: {
  basePath: string;
  page: number;
  totalPages: number;
  search?: string;
  status?: string;
  sort?: string;
  dir?: "asc" | "desc";
}) {
  if (totalPages <= 1) return null;

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status && status !== "all") params.set("status", status);
    if (sort) params.set("sort", sort);
    if (dir) params.set("dir", dir);
    params.set("page", String(p));
    return `${basePath}?${params.toString()}`;
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3 text-sm">
      {pages.map((p) => (
        <Link
          key={p}
          href={hrefFor(p)}
          className={`rounded-lg px-3 py-1.5 font-medium ${p === page ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          {p}
        </Link>
      ))}
    </div>
  );
}
