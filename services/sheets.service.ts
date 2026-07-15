import type { sheets_v4 } from "googleapis";
import { getEnv } from "@/config/env";
import { getSheetsClient } from "@/lib/google/sheets-client";
import { prisma } from "@/lib/prisma";
import { PAYFAST_CURRENCY_CODE } from "@/constants/payfast";

export interface PaidRegistrationRow {
  registrationId: string;
  registrationDate: Date;
  formSubmissionTime: Date;
  basketId: string;
  studentName: string;
  fatherName: string | null;
  email: string;
  phone: string;
  cnic: string | null;
  gender: string;
  dateOfBirth: Date | null;
  program: string;
  campus: string;
  session: string;
  fee: number;
  paymentStatus: string;
  country: string;
  province: string | null;
  city: string;
  postalCode: string | null;
  address: string;
  paymentMethod: string | null;
  transactionId: string | null;
  amountPaid: number;
  paymentDate: Date;
  customFieldValues: Record<string, unknown>;
  registrationType: string;
  participants: { fullName: string; cnic: string }[];
}

const CORE_HEADER_ROW = [
  // Student Information
  "Full Name",
  "Father Name",
  "Email",
  "Phone Number",
  "CNIC/Passport",
  "Gender",
  "Date of Birth",
  // Program Information
  "Program Name",
  "Campus",
  "Session",
  "Course Fee",
  "Payment Status",
  "PayFast Transaction ID",
  "Payment Date",
  // Address
  "Country",
  "Province/State",
  "City",
  "Postal Code",
  "Complete Address",
  // Additional Information
  "Registration ID",
  "Registration Date",
  "Form Submission Time",
  "Payment Method",
  "Currency",
  "Amount Paid",
  "Merchant Reference",
  // Multi-participant registrations (blank for Single)
  "Registration Type",
  "Participants",
];

// 0-based index of "Registration ID" in CORE_HEADER_ROW - the key column
// used to find an existing row so a re-sync updates it in place instead of
// adding a duplicate. Keep in sync with CORE_HEADER_ROW / buildCoreRowValues.
// (Was 20 before Batch was removed from the header - recomputed to 19.)
const REGISTRATION_ID_COLUMN_INDEX = 19;
const KEY_COLUMN_LETTER = columnLetter(REGISTRATION_ID_COLUMN_INDEX);

function columnLetter(zeroBasedIndex: number): string {
  let index = zeroBasedIndex + 1;
  let letters = "";
  while (index > 0) {
    const remainder = (index - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    index = Math.floor((index - 1) / 26);
  }
  return letters;
}

// Sheet names containing spaces or special characters must be single-quoted
// in A1 notation; escape any literal single quotes in the name itself.
function quoteSheetName(sheetName: string): string {
  return `'${sheetName.replace(/'/g, "''")}'`;
}

/**
 * Active custom (fully dynamic, mapsToColumn == null) fields ordered by
 * their permanent sheetColumnIndex. Appended after CORE_HEADER_ROW - see
 * prisma/schema.prisma FormField.sheetColumnIndex: a column slot, once
 * assigned, is never reused even if the field is later deactivated, so
 * reordering/removing a field never misaligns historical rows.
 */
async function getActiveCustomFields() {
  return prisma.formField.findMany({
    where: { mapsToColumn: null, isActive: true, sheetColumnIndex: { not: null } },
    orderBy: { sheetColumnIndex: "asc" },
  });
}

function formatCustomValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map((v) => String(v)).join("; ");
  return String(value);
}

// Tracks which spreadsheet/tab pairs have already been confirmed to exist
// (and had their header refreshed) this process lifetime, to avoid extra API
// calls on every sync. A fresh deploy/cold start clears this, so a header
// that drifts after a schema change still self-heals on next boot. Also
// cleared explicitly by invalidateSheetHeaderCache() whenever the Form
// Builder adds/relabels a custom field, so the header self-heals immediately
// instead of waiting for a cold start.
const ensuredTabs = new Set<string>();

export function invalidateSheetHeaderCache(): void {
  ensuredTabs.clear();
}

async function ensureSheetTabReady(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  headerRow: string[],
  lastColumnLetter: string,
): Promise<void> {
  const cacheKey = `${spreadsheetId}:${sheetName}:${headerRow.length}`;
  if (ensuredTabs.has(cacheKey)) return;

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = spreadsheet.data.sheets?.some((sheet) => sheet.properties?.title === sheetName);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    });
  }

  // Always (re)write the header, whether the tab is brand new or pre-existed
  // from before a column schema change - this is what makes a stale header
  // (from an earlier deploy, or a newly added custom field) self-heal
  // instead of silently staying wrong.
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteSheetName(sheetName)}!A1:${lastColumnLetter}1`,
    valueInputOption: "RAW",
    requestBody: { values: [headerRow] },
  });

  ensuredTabs.add(cacheKey);
}

/**
 * Finds the 1-based sheet row number of an existing row for this
 * registration, if any, by scanning the Registration ID column. Returns
 * null if no such row exists yet (i.e. this is a first-time sync).
 */
async function findExistingRowNumber(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  registrationId: string,
): Promise<number | null> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteSheetName(sheetName)}!${KEY_COLUMN_LETTER}2:${KEY_COLUMN_LETTER}`,
  });

  const values = response.data.values ?? [];
  const index = values.findIndex((row) => row[0] === registrationId);
  return index === -1 ? null : index + 2; // +1 for 1-based, +1 to skip the header row
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildCoreRowValues(row: PaidRegistrationRow): string[] {
  return [
    row.studentName,
    row.fatherName ?? "",
    row.email,
    row.phone,
    row.cnic ?? "",
    row.gender,
    row.dateOfBirth ? toDateOnly(row.dateOfBirth) : "",
    row.program,
    row.campus,
    row.session,
    row.fee.toFixed(2),
    row.paymentStatus,
    row.transactionId ?? "",
    row.paymentDate.toISOString(),
    row.country,
    row.province ?? "",
    row.city,
    row.postalCode ?? "",
    row.address,
    row.registrationId,
    toDateOnly(row.registrationDate),
    row.formSubmissionTime.toISOString(),
    row.paymentMethod ?? "",
    PAYFAST_CURRENCY_CODE,
    row.amountPaid.toFixed(2),
    row.basketId,
    row.registrationType,
    row.participants.length > 0 ? row.participants.map((p) => `${p.fullName} (${p.cnic})`).join("; ") : "",
  ];
}

const SYNC_MAX_ATTEMPTS = 3;
const SYNC_RETRY_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Upserts a paid registration's row in the configured Google Sheet, keyed on
 * Registration ID: updates the existing row in place if one was already
 * written for this registration (e.g. a duplicate IPN, or an admin retry
 * after the first sync partially failed), otherwise appends a new row. This
 * is what keeps repeated syncs from producing duplicate rows.
 *
 * Columns are CORE_HEADER_ROW followed by one column per currently-active
 * custom (Form Builder) field, in their permanent sheetColumnIndex order.
 *
 * Retries transient failures a few times before giving up - the caller
 * (services/payment.service.ts) treats a thrown error here as non-fatal to
 * the payment confirmation and records it on the registration for a manual
 * admin retry instead.
 */
export async function appendPaidRegistrationRow(row: PaidRegistrationRow): Promise<void> {
  const env = getEnv();
  const sheets = getSheetsClient();
  const spreadsheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = env.GOOGLE_SHEETS_SHEET_NAME;

  const customFields = await getActiveCustomFields();
  const headerRow = [...CORE_HEADER_ROW, ...customFields.map((f) => f.label)];
  const lastColumnLetter = columnLetter(headerRow.length - 1);
  const values = [
    [
      ...buildCoreRowValues(row),
      ...customFields.map((f) => formatCustomValue(row.customFieldValues?.[f.key])),
    ],
  ];

  let lastError: unknown;

  for (let attempt = 1; attempt <= SYNC_MAX_ATTEMPTS; attempt++) {
    try {
      await ensureSheetTabReady(sheets, spreadsheetId, sheetName, headerRow, lastColumnLetter);

      const existingRowNumber = await findExistingRowNumber(sheets, spreadsheetId, sheetName, row.registrationId);

      if (existingRowNumber) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${quoteSheetName(sheetName)}!A${existingRowNumber}:${lastColumnLetter}${existingRowNumber}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values },
        });
        console.log(`[Sheets] Updated existing row ${existingRowNumber} basketId=${row.basketId} attempt=${attempt}`);
      } else {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${quoteSheetName(sheetName)}!A:${lastColumnLetter}`,
          valueInputOption: "USER_ENTERED",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values },
        });
        console.log(`[Sheets] Appended new row basketId=${row.basketId} attempt=${attempt}`);
      }

      return;
    } catch (error) {
      lastError = error;
      console.error(`[Sheets] Sync attempt ${attempt}/${SYNC_MAX_ATTEMPTS} failed basketId=${row.basketId}`, error);
      if (attempt < SYNC_MAX_ATTEMPTS) {
        await sleep(SYNC_RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to sync registration to Google Sheet");
}
