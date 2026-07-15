import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface CampusInput {
  name: string;
  address?: string | null;
  displayOrder?: number | null;
}

export const CAMPUS_SORT_KEYS = ["name", "displayOrder", "createdAt"] as const;
export type CampusSortKey = (typeof CAMPUS_SORT_KEYS)[number];

export interface CampusListFilters {
  search?: string;
  status?: "all" | "active" | "inactive";
  page?: number;
  pageSize?: number;
  sort?: CampusSortKey;
  dir?: "asc" | "desc";
}

/** Full unfiltered list - used for dropdown/checkbox option sources and the live public registration form. Do not paginate this. */
export async function listCampuses() {
  return prisma.campus.findMany({ orderBy: { displayOrder: "asc" } });
}

export async function listCampusesPaginated(filters: CampusListFilters = {}) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize ?? 10;
  const status = filters.status ?? "all";

  const where: Prisma.CampusWhereInput = {
    ...(status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {}),
    ...(filters.search ? { name: { contains: filters.search, mode: "insensitive" } } : {}),
  };

  const dir = filters.dir ?? "asc";
  const orderBy: Prisma.CampusOrderByWithRelationInput[] = filters.sort
    ? [{ [filters.sort]: dir }, { name: "asc" }]
    : [{ displayOrder: "asc" }, { name: "asc" }];

  const [items, total] = await Promise.all([
    prisma.campus.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.campus.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getCampus(id: string) {
  return prisma.campus.findUnique({ where: { id } });
}

export async function createCampus(input: CampusInput) {
  let displayOrder = input.displayOrder ?? undefined;
  if (displayOrder == null) {
    const last = await prisma.campus.findFirst({ orderBy: { displayOrder: "desc" } });
    displayOrder = (last?.displayOrder ?? -1) + 1;
  }
  return prisma.campus.create({ data: { name: input.name, address: input.address, displayOrder } });
}

export async function updateCampus(id: string, input: CampusInput) {
  return prisma.campus.update({
    where: { id },
    data: { name: input.name, address: input.address, ...(input.displayOrder != null ? { displayOrder: input.displayOrder } : {}) },
  });
}

export async function toggleCampusActive(id: string) {
  const campus = await prisma.campus.findUniqueOrThrow({ where: { id } });
  return prisma.campus.update({ where: { id }, data: { isActive: !campus.isActive } });
}

export async function deleteCampus(id: string) {
  return prisma.campus.delete({ where: { id } });
}

export async function bulkSetCampusesActive(ids: string[], isActive: boolean) {
  return prisma.campus.updateMany({ where: { id: { in: ids } }, data: { isActive } });
}
