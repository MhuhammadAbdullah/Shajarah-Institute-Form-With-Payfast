import { z } from "zod";
import type { PublicFormField } from "@/lib/formEngine/types";

/**
 * Builds a Zod schema for a set of dynamic form fields. Pure - no
 * server-only imports - so it runs identically in the browser (wizard
 * per-step validation, react-hook-form's zodResolver) and on the server
 * (the authoritative check in app/api/register/route.ts). One function,
 * every consumer gets validation parity by construction.
 *
 * Requiredness is NOT expressed via Zod's native `.optional()` per field -
 * every field's base type is optional at the shape level. Instead a single
 * `.superRefine` enforces conditional requiredness: a field with
 * `dependsOnFieldKey` is only required/validated when the controlling
 * field's submitted value matches `dependsOnValue`; otherwise it's skipped
 * regardless of its own `isRequired` flag.
 */
export function buildZodSchemaForFields(fields: PublicFormField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    shape[field.key] = baseTypeFor(field).optional().nullable();
  }

  return z.object(shape).superRefine((data, ctx) => {
    for (const field of fields) {
      const value = (data as Record<string, unknown>)[field.key];

      if (field.dependsOnFieldKey) {
        const controllingValue = (data as Record<string, unknown>)[field.dependsOnFieldKey];
        const controllingMatches = stringifyValue(controllingValue) === field.dependsOnValue;
        if (!controllingMatches) continue; // not applicable right now - never required, never validated
      }

      const isEmpty = value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

      if (field.isRequired && isEmpty) {
        ctx.addIssue({
          code: "custom",
          path: [field.key],
          message: `${field.label} is required`,
        });
        continue;
      }

      if (isEmpty) continue; // optional and not provided - nothing further to check

      const rules = field.validationRules;
      if (!rules) continue;

      if (typeof value === "string") {
        if (rules.minLength !== undefined && value.length < rules.minLength) {
          ctx.addIssue({ code: "custom", path: [field.key], message: `${field.label} must be at least ${rules.minLength} characters` });
        }
        if (rules.maxLength !== undefined && value.length > rules.maxLength) {
          ctx.addIssue({ code: "custom", path: [field.key], message: `${field.label} must be at most ${rules.maxLength} characters` });
        }
        if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
          ctx.addIssue({ code: "custom", path: [field.key], message: rules.patternMessage ?? `${field.label} is invalid` });
        }
      }

      if (typeof value === "number") {
        if (rules.min !== undefined && value < rules.min) {
          ctx.addIssue({ code: "custom", path: [field.key], message: `${field.label} must be at least ${rules.min}` });
        }
        if (rules.max !== undefined && value > rules.max) {
          ctx.addIssue({ code: "custom", path: [field.key], message: `${field.label} must be at most ${rules.max}` });
        }
      }

      if (Array.isArray(value)) {
        if (rules.minSelected !== undefined && value.length < rules.minSelected) {
          ctx.addIssue({ code: "custom", path: [field.key], message: `Select at least ${rules.minSelected} option(s) for ${field.label}` });
        }
        if (rules.maxSelected !== undefined && value.length > rules.maxSelected) {
          ctx.addIssue({ code: "custom", path: [field.key], message: `Select at most ${rules.maxSelected} option(s) for ${field.label}` });
        }
      }
    }
  });
}

function stringifyValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value ?? "");
}

function baseTypeFor(field: PublicFormField): z.ZodTypeAny {
  switch (field.type) {
    case "EMAIL":
      return z.string().email("Enter a valid email address");
    case "NUMBER":
      return z.coerce.number();
    case "CHECKBOX":
      return z.boolean();
    case "MULTI_SELECT":
      return z.array(z.string());
    case "FILE":
      return z.string().url("Invalid file upload");
    case "TEXT":
    case "TEXTAREA":
    case "PHONE":
    case "DATE":
    case "SELECT":
    case "RADIO":
    default:
      return z.string();
  }
}
