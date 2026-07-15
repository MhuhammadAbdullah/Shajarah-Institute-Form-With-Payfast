import type { PublicFormField } from "@/lib/formEngine/types";

/**
 * Splits a validated dynamic form submission into the finite set of "core"
 * values that bind to real Registration columns (mapsToColumn set) and
 * everything else, which is fully dynamic and stored as-is in
 * Registration.customFieldValues. See the hybrid data-storage design in
 * services/registration.service.ts / prisma/schema.prisma.
 */
export function splitSubmission(
  fields: PublicFormField[],
  data: Record<string, unknown>,
): { core: Record<string, unknown>; custom: Record<string, unknown> } {
  const core: Record<string, unknown> = {};
  const custom: Record<string, unknown> = {};

  for (const field of fields) {
    const value = data[field.key];
    if (field.mapsToColumn) {
      core[field.mapsToColumn] = value;
    } else {
      custom[field.key] = value;
    }
  }

  return { core, custom };
}
