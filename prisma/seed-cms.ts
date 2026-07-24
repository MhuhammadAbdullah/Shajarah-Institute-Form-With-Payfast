import { Prisma, PrismaClient } from "@prisma/client";
import { PROGRAMS, PROGRAM_FEES, CAMPUSES, SESSIONS } from "../constants/programs";

const prisma = new PrismaClient();

async function seedCmsLookups() {
  console.log("Seeding Program/Campus/Session from constants/programs.ts...");
  for (let i = 0; i < PROGRAMS.length; i++) {
    await prisma.program.upsert({ where: { name: PROGRAMS[i] }, update: { displayOrder: i }, create: { name: PROGRAMS[i], displayOrder: i } });
  }
  for (let i = 0; i < CAMPUSES.length; i++) {
    await prisma.campus.upsert({ where: { name: CAMPUSES[i] }, update: { displayOrder: i }, create: { name: CAMPUSES[i], displayOrder: i } });
  }
  for (let i = 0; i < SESSIONS.length; i++) {
    await prisma.session.upsert({ where: { name: SESSIONS[i] }, update: { displayOrder: i }, create: { name: SESSIONS[i], displayOrder: i } });
  }

  // Backfill any historical values used on real registrations but not in
  // today's constants, so old data stays consistent - marked inactive so
  // they don't appear as new selectable options.
  const distinctValues = await prisma.registration.findMany({
    select: { program: true, campus: true, session: true },
    distinct: ["program", "campus", "session"],
  });

  const missingPrograms = new Set(distinctValues.map((r) => r.program).filter((v) => !PROGRAMS.includes(v as never)));
  const missingCampuses = new Set(distinctValues.map((r) => r.campus).filter((v) => !CAMPUSES.includes(v as never)));
  const missingSessions = new Set(distinctValues.map((r) => r.session).filter((v) => !SESSIONS.includes(v as never)));

  for (const name of missingPrograms) {
    await prisma.program.upsert({ where: { name }, update: {}, create: { name, isActive: false, displayOrder: 999 } });
  }
  for (const name of missingCampuses) {
    await prisma.campus.upsert({ where: { name }, update: {}, create: { name, isActive: false, displayOrder: 999 } });
  }
  for (const name of missingSessions) {
    await prisma.session.upsert({ where: { name }, update: {}, create: { name, isActive: false, displayOrder: 999 } });
  }

  console.log("Seeding FeeStructure for combinations that occur in existing registrations...");
  for (const combo of distinctValues) {
    const [program, campus, session] = await Promise.all([
      prisma.program.findUnique({ where: { name: combo.program } }),
      prisma.campus.findUnique({ where: { name: combo.campus } }),
      prisma.session.findUnique({ where: { name: combo.session } }),
    ]);
    if (!program || !campus || !session) continue;

    const fee = PROGRAM_FEES[combo.program as (typeof PROGRAMS)[number]] ?? 0;

    await prisma.feeStructure.upsert({
      where: {
        programId_campusId_sessionId: {
          programId: program.id,
          campusId: campus.id,
          sessionId: session.id,
        },
      },
      update: {},
      create: {
        programId: program.id,
        campusId: campus.id,
        sessionId: session.id,
        fee,
        currency: "PKR",
      },
    });
  }

  // Program<->Campus/Session associations, backfilled from every combo
  // that occurs in an existing FeeStructure - without this, a program's
  // Campus/Session dropdowns on the live form would be empty the moment
  // this schema ships (see plan notes on this being correctness-critical).
  console.log("Backfilling ProgramCampus/ProgramSession associations from existing FeeStructure rows...");
  const feeStructures = await prisma.feeStructure.findMany({ select: { programId: true, campusId: true, sessionId: true } });
  for (const fs of feeStructures) {
    await prisma.programCampus.upsert({
      where: { programId_campusId: { programId: fs.programId, campusId: fs.campusId } },
      update: {},
      create: { programId: fs.programId, campusId: fs.campusId },
    });
    await prisma.programSession.upsert({
      where: { programId_sessionId: { programId: fs.programId, sessionId: fs.sessionId } },
      update: {},
      create: { programId: fs.programId, sessionId: fs.sessionId },
    });
  }

  // Programs with no FeeStructure yet (e.g. freshly seeded from constants,
  // no registrations reference them) still need at least a starting set of
  // associations so admins aren't staring at empty dropdowns - associate
  // every active program with every active campus/session by default; the
  // admin can trim these down via the Program edit form.
  const [allPrograms, allCampuses, allSessions] = await Promise.all([
    prisma.program.findMany({ where: { isActive: true } }),
    prisma.campus.findMany({ where: { isActive: true } }),
    prisma.session.findMany({ where: { isActive: true } }),
  ]);
  const programsWithAssociations = new Set(feeStructures.map((fs) => fs.programId));
  for (const program of allPrograms) {
    if (programsWithAssociations.has(program.id)) continue;
    for (const campus of allCampuses) {
      await prisma.programCampus.upsert({
        where: { programId_campusId: { programId: program.id, campusId: campus.id } },
        update: {},
        create: { programId: program.id, campusId: campus.id },
      });
    }
    for (const session of allSessions) {
      await prisma.programSession.upsert({
        where: { programId_sessionId: { programId: program.id, sessionId: session.id } },
        update: {},
        create: { programId: program.id, sessionId: session.id },
      });
    }
  }
}

interface FieldSeed {
  key: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  type:
    | "TEXT"
    | "TEXTAREA"
    | "EMAIL"
    | "NUMBER"
    | "PHONE"
    | "DATE"
    | "SELECT"
    | "MULTI_SELECT"
    | "RADIO"
    | "CHECKBOX"
    | "FILE";
  isRequired?: boolean;
  isSearchable?: boolean;
  defaultValue?: string;
  mapsToColumn?: string;
  optionSource?: "STATIC" | "PROGRAMS" | "CAMPUSES" | "SESSIONS";
  options?: { label: string; value: string; triggersFreeText?: boolean }[];
  dependsOnKey?: string;
  dependsOnValue?: string;
  validationRules?: Record<string, unknown>;
}

interface SectionSeed {
  key: string;
  title: string;
  description?: string;
  fields: FieldSeed[];
}

interface StepSeed {
  key: string;
  title: string;
  description?: string;
  sections: SectionSeed[];
}

const FORM_SEED: StepSeed[] = [
  {
    key: "student-information",
    title: "Registration Information",
    description: "Tell us about the applicant, the program, and how to reach you.",
    sections: [
      {
        key: "student-info",
        title: "Student Information",
        fields: [
          {
            key: "registrationType",
            label: "Registration Type",
            type: "RADIO",
            isRequired: true,
            defaultValue: "SINGLE",
            mapsToColumn: "registrationType",
            options: [
              { label: "Single Registration", value: "SINGLE" },
              { label: "Multiple Registration", value: "MULTIPLE" },
            ],
          },
          { key: "studentName", label: "Full Name", type: "TEXT", isRequired: true, mapsToColumn: "studentName" },
          { key: "fatherName", label: "Father Name", type: "TEXT", mapsToColumn: "fatherName" },
          { key: "email", label: "Email", type: "EMAIL", isRequired: true, mapsToColumn: "email" },
          {
            key: "phone",
            label: "Phone Number",
            type: "PHONE",
            isRequired: true,
            placeholder: "03001234567",
            mapsToColumn: "phone",
          },
          {
            key: "cnic",
            label: "CNIC / Passport",
            type: "TEXT",
            isRequired: true,
            placeholder: "42101-1234567-1",
            mapsToColumn: "cnic",
          },
          {
            key: "gender",
            label: "Gender",
            type: "SELECT",
            isRequired: true,
            mapsToColumn: "gender",
            options: [
              { label: "Male", value: "MALE" },
              { label: "Female", value: "FEMALE" },
            ],
          },
          { key: "dateOfBirth", label: "Date of Birth", type: "DATE", mapsToColumn: "dateOfBirth" },
        ],
      },
      {
        key: "program-info",
        title: "Program Information",
        fields: [
          { key: "program", label: "Program", type: "SELECT", isRequired: true, mapsToColumn: "program", optionSource: "PROGRAMS" },
          { key: "campus", label: "Campus", type: "SELECT", isRequired: true, mapsToColumn: "campus", optionSource: "CAMPUSES" },
          { key: "session", label: "Session", type: "SELECT", isRequired: true, mapsToColumn: "session", optionSource: "SESSIONS" },
        ],
      },
      {
        key: "address",
        title: "Address",
        fields: [
          {
            key: "country",
            label: "Country",
            type: "SELECT",
            isRequired: true,
            isSearchable: true,
            mapsToColumn: "country",
            // Rendered by components/registration/LocationCascadeFields.tsx
            // (country-state-city dataset), not the generic SELECT renderer -
            // this optionSource/options pair is unused but kept as a safe
            // fallback shape.
            optionSource: "STATIC",
            options: [],
          },
          {
            key: "province",
            label: "Province/State",
            type: "SELECT",
            isRequired: true,
            isSearchable: true,
            mapsToColumn: "province",
            optionSource: "STATIC",
            options: [],
          },
          {
            key: "city",
            label: "City",
            type: "SELECT",
            isRequired: true,
            isSearchable: true,
            mapsToColumn: "city",
            optionSource: "STATIC",
            options: [],
          },
          { key: "postalCode", label: "Postal Code", type: "TEXT", mapsToColumn: "postalCode" },
          { key: "address", label: "Address", type: "TEXTAREA", isRequired: true, mapsToColumn: "address" },
        ],
      },
      {
        key: "lead-source",
        title: "How did you hear about Shajarah Institute?",
        fields: [
          {
            key: "howDidYouHear",
            label: "How did you hear about Shajarah Institute?",
            type: "SELECT",
            isRequired: true,
            optionSource: "STATIC",
            options: [
              { label: "Facebook", value: "Facebook" },
              { label: "Instagram", value: "Instagram" },
              { label: "Google Search", value: "Google Search" },
              { label: "YouTube", value: "YouTube" },
              { label: "Friend", value: "Friend" },
              { label: "Family", value: "Family" },
              { label: "WhatsApp", value: "WhatsApp" },
              { label: "Existing Student", value: "Existing Student" },
              { label: "Seminar", value: "Seminar" },
              { label: "Advertisement", value: "Advertisement" },
              { label: "Other", value: "Other", triggersFreeText: true },
            ],
          },
          {
            key: "howDidYouHearOther",
            label: "Please specify",
            type: "TEXT",
            dependsOnKey: "howDidYouHear",
            dependsOnValue: "Other",
          },
        ],
      },
      {
        key: "additional-questions",
        title: "Additional Questions",
        description: "Custom questions added by the admin appear here.",
        fields: [],
      },
    ],
  },
  {
    key: "review-and-payment",
    title: "Review & Payment",
    description: "Review your details before proceeding to payment.",
    sections: [
      {
        key: "review",
        title: "Confirmation",
        fields: [
          {
            key: "agreementAccepted",
            label: "I confirm that the information provided is accurate and I agree to Shajarah Institute's terms, conditions, and refund policy.",
            type: "CHECKBOX",
            isRequired: true,
            mapsToColumn: "agreementAccepted",
          },
          {
            key: "privacyAccepted",
            label: "I agree to the Privacy Policy.",
            type: "CHECKBOX",
            isRequired: true,
          },
        ],
      },
    ],
  },
];

async function seedFormDefinition() {
  console.log("Seeding default FormStep/FormSection/FormField tree...");

  for (let stepIndex = 0; stepIndex < FORM_SEED.length; stepIndex++) {
    const stepSeed = FORM_SEED[stepIndex];
    const step = await prisma.formStep.upsert({
      where: { key: stepSeed.key },
      update: { title: stepSeed.title, description: stepSeed.description, displayOrder: stepIndex },
      create: { key: stepSeed.key, title: stepSeed.title, description: stepSeed.description, displayOrder: stepIndex },
    });

    for (let sectionIndex = 0; sectionIndex < stepSeed.sections.length; sectionIndex++) {
      const sectionSeed = stepSeed.sections[sectionIndex];
      const section = await prisma.formSection.upsert({
        where: { key: sectionSeed.key },
        update: { title: sectionSeed.title, description: sectionSeed.description, displayOrder: sectionIndex, stepId: step.id },
        create: {
          key: sectionSeed.key,
          title: sectionSeed.title,
          description: sectionSeed.description,
          displayOrder: sectionIndex,
          stepId: step.id,
        },
      });

      for (let fieldIndex = 0; fieldIndex < sectionSeed.fields.length; fieldIndex++) {
        const fieldSeed = sectionSeed.fields[fieldIndex];

        const field = await prisma.formField.upsert({
          where: { key: fieldSeed.key },
          update: {
            label: fieldSeed.label,
            placeholder: fieldSeed.placeholder,
            helpText: fieldSeed.helpText,
            type: fieldSeed.type,
            isRequired: fieldSeed.isRequired ?? false,
            isSearchable: fieldSeed.isSearchable ?? false,
            defaultValue: fieldSeed.defaultValue,
            displayOrder: fieldIndex,
            mapsToColumn: fieldSeed.mapsToColumn,
            optionSource: fieldSeed.optionSource,
            validationRules: fieldSeed.validationRules as Prisma.InputJsonValue | undefined,
            sectionId: section.id,
          },
          create: {
            key: fieldSeed.key,
            label: fieldSeed.label,
            placeholder: fieldSeed.placeholder,
            helpText: fieldSeed.helpText,
            type: fieldSeed.type,
            isRequired: fieldSeed.isRequired ?? false,
            isSearchable: fieldSeed.isSearchable ?? false,
            defaultValue: fieldSeed.defaultValue,
            displayOrder: fieldIndex,
            mapsToColumn: fieldSeed.mapsToColumn,
            optionSource: fieldSeed.optionSource,
            validationRules: fieldSeed.validationRules as Prisma.InputJsonValue | undefined,
            sectionId: section.id,
          },
        });

        if (fieldSeed.options) {
          for (let optionIndex = 0; optionIndex < fieldSeed.options.length; optionIndex++) {
            const optionSeed = fieldSeed.options[optionIndex];
            const existing = await prisma.formFieldOption.findFirst({
              where: { fieldId: field.id, value: optionSeed.value },
            });
            if (existing) {
              await prisma.formFieldOption.update({
                where: { id: existing.id },
                data: { label: optionSeed.label, displayOrder: optionIndex, triggersFreeText: optionSeed.triggersFreeText ?? false },
              });
            } else {
              await prisma.formFieldOption.create({
                data: {
                  fieldId: field.id,
                  label: optionSeed.label,
                  value: optionSeed.value,
                  displayOrder: optionIndex,
                  triggersFreeText: optionSeed.triggersFreeText ?? false,
                },
              });
            }
          }

          // Remove any option that's no longer part of this field's seed list
          // (e.g. Gender's old "Other" value) - the seed is the source of
          // truth for these admin-managed dropdowns, so a stale option left
          // behind by an earlier seed run would otherwise stay selectable.
          const seededValues = fieldSeed.options.map((o) => o.value);
          await prisma.formFieldOption.deleteMany({
            where: { fieldId: field.id, value: { notIn: seededValues } },
          });
        }
      }
    }
  }

  // Current Studies was removed from the product per the requirements
  // update - deactivate (never delete) the section and its fields so any
  // FormField.sheetColumnIndex already assigned to them stays reserved and
  // historical Sheets rows/columns stay aligned, consistent with the
  // append-only column convention used everywhere else in this schema.
  const removedSection = await prisma.formSection.findUnique({ where: { key: "current-studies" } });
  if (removedSection) {
    await prisma.formSection.update({ where: { id: removedSection.id }, data: { isActive: false } });
    await prisma.formField.updateMany({ where: { sectionId: removedSection.id }, data: { isActive: false } });
    console.log("Deactivated legacy 'Current Studies' section and its fields.");
  }

  // Educational Information, Professional Information, and Emergency Contact
  // were removed from the product per the requirements update (form
  // collapsed to 2 steps: Registration Information, Review & Payment) -
  // deactivate (never delete) each section and its fields, same convention
  // as Current Studies above: keeps any FormField.sheetColumnIndex already
  // assigned to them reserved so historical Sheets rows/columns stay
  // aligned, and preserves Registration.customFieldValues on existing rows
  // for the admin Registration Detail page (see listAllCustomFieldDefinitions
  // in services/formBuilder.service.ts).
  for (const sectionKey of ["educational-info", "professional-info", "emergency-contact"]) {
    const section = await prisma.formSection.findUnique({ where: { key: sectionKey } });
    if (section) {
      await prisma.formSection.update({ where: { id: section.id }, data: { isActive: false } });
      await prisma.formField.updateMany({ where: { sectionId: section.id }, data: { isActive: false } });
      console.log(`Deactivated legacy '${sectionKey}' section and its fields.`);
    }
  }

  // The old "Program & Education" and "Address & Additional Information"
  // steps are superseded by the merged "student-information" step above
  // (their surviving sections were moved into it via upsert, since section
  // stepId is reassigned on every seed run) - deactivate the now-empty step
  // shells rather than deleting them.
  for (const stepKey of ["program-and-education", "address-and-additional"]) {
    const step = await prisma.formStep.findUnique({ where: { key: stepKey } });
    if (step) {
      await prisma.formStep.update({ where: { id: step.id }, data: { isActive: false } });
      console.log(`Deactivated legacy '${stepKey}' step.`);
    }
  }

  // Second pass: wire up dependsOnFieldId now that every field has been
  // created (dependencies can reference fields seeded earlier in the loop).
  for (const stepSeed of FORM_SEED) {
    for (const sectionSeed of stepSeed.sections) {
      for (const fieldSeed of sectionSeed.fields) {
        if (!fieldSeed.dependsOnKey) continue;
        const [field, dependsOnField] = await Promise.all([
          prisma.formField.findUnique({ where: { key: fieldSeed.key } }),
          prisma.formField.findUnique({ where: { key: fieldSeed.dependsOnKey } }),
        ]);
        if (!field || !dependsOnField) continue;
        await prisma.formField.update({
          where: { id: field.id },
          data: { dependsOnFieldId: dependsOnField.id, dependsOnValue: fieldSeed.dependsOnValue },
        });
      }
    }
  }
}

async function main() {
  await seedCmsLookups();
  await seedFormDefinition();
  console.log("CMS + Form Builder seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
