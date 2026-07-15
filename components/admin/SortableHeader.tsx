import Link from "next/link";

export function SortableHeader({
  label,
  sortKey,
  basePath,
  currentSort,
  currentDir,
  search,
  status,
}: {
  label: string;
  sortKey: string;
  basePath: string;
  currentSort?: string;
  currentDir?: "asc" | "desc";
  search?: string;
  status?: string;
}) {
  const isActive = currentSort === sortKey;
  const nextDir: "asc" | "desc" = isActive && currentDir === "asc" ? "desc" : "asc";

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status && status !== "all") params.set("status", status);
  params.set("sort", sortKey);
  params.set("dir", nextDir);

  return (
    <Link href={`${basePath}?${params.toString()}`} className="inline-flex items-center gap-1 hover:text-slate-900">
      {label}
      <span className="text-slate-400">
        {isActive ? (currentDir === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    </Link>
  );
}
