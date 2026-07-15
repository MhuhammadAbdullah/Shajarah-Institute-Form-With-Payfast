import { Prisma } from "@prisma/client";

export interface BulkDeleteResult {
  deletedCount: number;
  failedCount: number;
}

/**
 * Deletes one at a time (not a single deleteMany) so a foreign-key
 * restriction on one row - e.g. a Program still referenced by a Fee
 * Structure - doesn't roll back the whole batch. Postgres aborts an entire
 * multi-row DELETE if any row violates a FK constraint, so per-row calls are
 * the only way to get partial success + an accurate per-batch count.
 */
export async function bulkDeleteWithFkGuard(ids: string[], deleteOne: (id: string) => Promise<unknown>): Promise<BulkDeleteResult> {
  let deletedCount = 0;
  let failedCount = 0;

  for (const id of ids) {
    try {
      await deleteOne(id);
      deletedCount++;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        failedCount++;
      } else {
        throw error;
      }
    }
  }

  return { deletedCount, failedCount };
}
