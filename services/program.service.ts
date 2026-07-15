import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface ProgramInput {
  name: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  displayOrder?: number | null;
}

export const PROGRAM_SORT_KEYS = ["name", "displayOrder", "createdAt"] as const;
export type ProgramSortKey = (typeof PROGRAM_SORT_KEYS)[number];

export interface ProgramListFilters {
  search?: string;
  status?: "all" | "active" | "inactive";
  page?: number;
  pageSize?: number;
  sort?: ProgramSortKey;
  dir?: "asc" | "desc";
}

/** Full unfiltered list - used for dropdown/checkbox option sources (Fee Structure form, Program's own Campus/Session pickers) and the live public registration form. Do not paginate this. */
export async function listPrograms() {
  return prisma.program.findMany({ orderBy: { displayOrder: "asc" } });
}

export async function listProgramsPaginated(filters: ProgramListFilters = {}) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize ?? 10;
  const status = filters.status ?? "all";

  const where: Prisma.ProgramWhereInput = {
    ...(status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {}),
    ...(filters.search ? { name: { contains: filters.search, mode: "insensitive" } } : {}),
  };

  const dir = filters.dir ?? "asc";
  const orderBy: Prisma.ProgramOrderByWithRelationInput[] = filters.sort
    ? [{ [filters.sort]: dir }, { name: "asc" }]
    : [{ displayOrder: "asc" }, { name: "asc" }];

  const [items, total] = await Promise.all([
    prisma.program.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.program.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getProgram(id: string) {
  return prisma.program.findUnique({ where: { id } });
}

export async function createProgram(input: ProgramInput) {
  let displayOrder = input.displayOrder ?? undefined;
  if (displayOrder == null) {
    const last = await prisma.program.findFirst({ orderBy: { displayOrder: "desc" } });
    displayOrder = (last?.displayOrder ?? -1) + 1;
  }
  return prisma.program.create({
    data: { name: input.name, description: input.description, thumbnailUrl: input.thumbnailUrl, displayOrder },
  });
}

export async function updateProgram(id: string, input: ProgramInput) {
  return prisma.program.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      thumbnailUrl: input.thumbnailUrl,
      ...(input.displayOrder != null ? { displayOrder: input.displayOrder } : {}),
    },
  });
}

export async function toggleProgramActive(id: string) {
  const program = await prisma.program.findUniqueOrThrow({ where: { id } });
  return prisma.program.update({ where: { id }, data: { isActive: !program.isActive } });
}

export async function deleteProgram(id: string) {
  return prisma.program.delete({ where: { id } });
}

export async function bulkSetProgramsActive(ids: string[], isActive: boolean) {
  return prisma.program.updateMany({ where: { id: { in: ids } }, data: { isActive } });
}
