import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PublicFormStep, PublicFormSection, PublicFormField, FieldValidationRules } from "@/lib/formEngine/types";
import { invalidateSheetHeaderCache } from "@/services/sheets.service";

/**
 * The single source of truth for the current published form definition -
 * consumed by the public wizard (render + client validation), the server
 * validation in app/api/register/route.ts, and the Sheets dynamic-column
 * layer in services/sheets.service.ts. Active-only, fully ordered.
 */
export async function getPublicFormSchema(): Promise<PublicFormStep[]> {
  const steps = await prisma.formStep.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    include: {
      sections: {
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
        include: {
          fields: {
            where: { isActive: true },
            orderBy: { displayOrder: "asc" },
            include: {
              options: { where: { isActive: true }, orderBy: { displayOrder: "asc" } },
              dependsOnField: { select: { key: true } },
            },
          },
        },
      },
    },
  });

  return steps.map(
    (step): PublicFormStep => ({
      id: step.id,
      key: step.key,
      title: step.title,
      description: step.description,
      sections: step.sections.map(
        (section): PublicFormSection => ({
          id: section.id,
          key: section.key,
          title: section.title,
          description: section.description,
          fields: section.fields.map(
            (field): PublicFormField => ({
              id: field.id,
              key: field.key,
              label: field.label,
              placeholder: field.placeholder,
              helpText: field.helpText,
              type: field.type,
              isRequired: field.isRequired,
              isSearchable: field.isSearchable,
              defaultValue: field.defaultValue,
              validationRules: (field.validationRules as FieldValidationRules | null) ?? null,
              optionSource: field.optionSource,
              options: field.options.map((o) => ({ id: o.id, label: o.label, value: o.value, triggersFreeText: o.triggersFreeText })),
              mapsToColumn: field.mapsToColumn,
              dependsOnFieldKey: field.dependsOnField?.key ?? null,
              dependsOnValue: field.dependsOnValue,
            }),
          ),
        }),
      ),
    }),
  );
}

/**
 * Every custom (mapsToColumn == null) field definition ever created,
 * active or not - used by the admin Registration Detail page to label
 * Registration.customFieldValues entries even for fields that have since
 * been deactivated (renamed/removed fields fall back to a raw key display).
 */
export async function listAllCustomFieldDefinitions() {
  return prisma.formField.findMany({
    where: { mapsToColumn: null },
    orderBy: { displayOrder: "asc" },
  });
}

// ── Admin: Steps ──────────────────────────────────────────────────────────

export async function listSteps() {
  return prisma.formStep.findMany({
    orderBy: { displayOrder: "asc" },
    include: { sections: { orderBy: { displayOrder: "asc" }, include: { fields: { orderBy: { displayOrder: "asc" }, include: { options: { orderBy: { displayOrder: "asc" } } } } } } },
  });
}

export interface StepInput {
  key: string;
  title: string;
  description?: string | null;
}

export async function createStep(input: StepInput) {
  const last = await prisma.formStep.findFirst({ orderBy: { displayOrder: "desc" } });
  return prisma.formStep.create({ data: { ...input, displayOrder: (last?.displayOrder ?? -1) + 1 } });
}

export async function updateStep(id: string, input: StepInput) {
  return prisma.formStep.update({ where: { id }, data: input });
}

export async function toggleStepActive(id: string) {
  const step = await prisma.formStep.findUniqueOrThrow({ where: { id } });
  return prisma.formStep.update({ where: { id }, data: { isActive: !step.isActive } });
}

export async function reorderStep(id: string, direction: "up" | "down") {
  const steps = await prisma.formStep.findMany({ orderBy: { displayOrder: "asc" } });
  await swapDisplayOrder(steps, id, direction, (s, data) => prisma.formStep.update({ where: { id: s.id }, data }));
}

// ── Admin: Sections ───────────────────────────────────────────────────────

export interface SectionInput {
  stepId: string;
  key: string;
  title: string;
  description?: string | null;
}

export async function createSection(input: SectionInput) {
  const last = await prisma.formSection.findFirst({ where: { stepId: input.stepId }, orderBy: { displayOrder: "desc" } });
  return prisma.formSection.create({ data: { ...input, displayOrder: (last?.displayOrder ?? -1) + 1 } });
}

export async function updateSection(id: string, input: Omit<SectionInput, "stepId">) {
  return prisma.formSection.update({ where: { id }, data: input });
}

export async function moveSectionToStep(id: string, stepId: string) {
  const last = await prisma.formSection.findFirst({ where: { stepId }, orderBy: { displayOrder: "desc" } });
  return prisma.formSection.update({ where: { id }, data: { stepId, displayOrder: (last?.displayOrder ?? -1) + 1 } });
}

export async function toggleSectionActive(id: string) {
  const section = await prisma.formSection.findUniqueOrThrow({ where: { id } });
  return prisma.formSection.update({ where: { id }, data: { isActive: !section.isActive } });
}

export async function reorderSection(id: string, direction: "up" | "down") {
  const section = await prisma.formSection.findUniqueOrThrow({ where: { id } });
  const siblings = await prisma.formSection.findMany({ where: { stepId: section.stepId }, orderBy: { displayOrder: "asc" } });
  await swapDisplayOrder(siblings, id, direction, (s, data) => prisma.formSection.update({ where: { id: s.id }, data }));
}

// ── Admin: Fields ─────────────────────────────────────────────────────────

export interface FieldInput {
  sectionId: string;
  key: string;
  label: string;
  placeholder?: string | null;
  helpText?: string | null;
  type: string;
  isRequired: boolean;
  isSearchable?: boolean;
  defaultValue?: string | null;
  validationRules?: FieldValidationRules | null;
  optionSource?: string | null;
  mapsToColumn?: string | null;
  dependsOnFieldId?: string | null;
  dependsOnValue?: string | null;
}

export async function createField(input: FieldInput) {
  const last = await prisma.formField.findFirst({ where: { sectionId: input.sectionId }, orderBy: { displayOrder: "desc" } });
  const field = await prisma.formField.create({
    data: {
      sectionId: input.sectionId,
      key: input.key,
      label: input.label,
      placeholder: input.placeholder,
      helpText: input.helpText,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: input.type as any,
      isRequired: input.isRequired,
      isSearchable: input.isSearchable ?? false,
      defaultValue: input.defaultValue,
      validationRules: (input.validationRules as Prisma.InputJsonValue | null) ?? undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      optionSource: input.optionSource as any,
      mapsToColumn: input.mapsToColumn,
      dependsOnFieldId: input.dependsOnFieldId,
      dependsOnValue: input.dependsOnValue,
      displayOrder: (last?.displayOrder ?? -1) + 1,
    },
  });

  if (!field.mapsToColumn) {
    await assignSheetColumnIndex(field.id);
  }

  invalidateSheetHeaderCache();
  return field;
}

export async function updateField(id: string, input: Omit<FieldInput, "sectionId">) {
  const field = await prisma.formField.update({
    where: { id },
    data: {
      key: input.key,
      label: input.label,
      placeholder: input.placeholder,
      helpText: input.helpText,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: input.type as any,
      isRequired: input.isRequired,
      isSearchable: input.isSearchable ?? false,
      defaultValue: input.defaultValue,
      validationRules: (input.validationRules as Prisma.InputJsonValue | null) ?? undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      optionSource: input.optionSource as any,
      mapsToColumn: input.mapsToColumn,
      dependsOnFieldId: input.dependsOnFieldId,
      dependsOnValue: input.dependsOnValue,
    },
  });

  if (!field.mapsToColumn && field.sheetColumnIndex == null) {
    await assignSheetColumnIndex(field.id);
  }

  invalidateSheetHeaderCache();
  return field;
}

/**
 * Assigns the next free Sheets column slot to a fully-dynamic field.
 * Permanent once assigned - see prisma/schema.prisma FormField.sheetColumnIndex
 * comment and services/sheets.service.ts - never reused, even if the field
 * is later deactivated.
 */
async function assignSheetColumnIndex(fieldId: string) {
  const highest = await prisma.formField.findFirst({
    where: { sheetColumnIndex: { not: null } },
    orderBy: { sheetColumnIndex: "desc" },
  });
  const nextIndex = (highest?.sheetColumnIndex ?? -1) + 1;
  await prisma.formField.update({ where: { id: fieldId }, data: { sheetColumnIndex: nextIndex } });
}

export async function toggleFieldActive(id: string) {
  const field = await prisma.formField.findUniqueOrThrow({ where: { id } });
  const updated = await prisma.formField.update({ where: { id }, data: { isActive: !field.isActive } });
  invalidateSheetHeaderCache();
  return updated;
}

export async function reorderField(id: string, direction: "up" | "down") {
  const field = await prisma.formField.findUniqueOrThrow({ where: { id } });
  const siblings = await prisma.formField.findMany({ where: { sectionId: field.sectionId }, orderBy: { displayOrder: "asc" } });
  await swapDisplayOrder(siblings, id, direction, (f, data) => prisma.formField.update({ where: { id: f.id }, data }));
}

export async function moveFieldToSection(id: string, sectionId: string) {
  const last = await prisma.formField.findFirst({ where: { sectionId }, orderBy: { displayOrder: "desc" } });
  return prisma.formField.update({ where: { id }, data: { sectionId, displayOrder: (last?.displayOrder ?? -1) + 1 } });
}

export async function deleteField(id: string) {
  await prisma.formField.delete({ where: { id } });
  invalidateSheetHeaderCache();
}

// ── Admin: Field options ────────────────────────────────────────────────

export interface FieldOptionInput {
  fieldId: string;
  label: string;
  value: string;
  triggersFreeText?: boolean;
}

export async function createFieldOption(input: FieldOptionInput) {
  const last = await prisma.formFieldOption.findFirst({ where: { fieldId: input.fieldId }, orderBy: { displayOrder: "desc" } });
  return prisma.formFieldOption.create({ data: { ...input, displayOrder: (last?.displayOrder ?? -1) + 1 } });
}

export async function updateFieldOption(id: string, input: Omit<FieldOptionInput, "fieldId">) {
  return prisma.formFieldOption.update({ where: { id }, data: input });
}

export async function deleteFieldOption(id: string) {
  return prisma.formFieldOption.delete({ where: { id } });
}

export async function reorderFieldOption(id: string, direction: "up" | "down") {
  const option = await prisma.formFieldOption.findUniqueOrThrow({ where: { id } });
  const siblings = await prisma.formFieldOption.findMany({ where: { fieldId: option.fieldId }, orderBy: { displayOrder: "asc" } });
  await swapDisplayOrder(siblings, id, direction, (o, data) => prisma.formFieldOption.update({ where: { id: o.id }, data }));
}

// ── Shared reorder helper ──────────────────────────────────────────────

async function swapDisplayOrder<T extends { id: string; displayOrder: number }>(
  items: T[],
  id: string,
  direction: "up" | "down",
  update: (item: T, data: { displayOrder: number }) => Promise<unknown>,
) {
  const index = items.findIndex((item) => item.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= items.length) return;

  await Promise.all([
    update(items[index], { displayOrder: items[swapWith].displayOrder }),
    update(items[swapWith], { displayOrder: items[index].displayOrder }),
  ]);
}
