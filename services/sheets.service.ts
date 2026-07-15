import type { sheets_v4 } from "googleapis";
import { getEnv } from "@/config/env";
import { getSheetsClient } from "@/lib/google/sheets-client";
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
  batch: string;
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
}

const HEADER_ROW = [
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
  "Batch",
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
];

// Sheet names containing spaces or special characters must be single-quoted
// in A1 notation; escape any literal single quotes in the name itself.
function quoteSheetName(sheetName: string): string {
  return `'${sheetName.replace(/'/g, "''")}'`;
}

// Tracks which spreadsheet/tab pairs have already been confirmed to exist
// this process lifetime, to avoid an extra API call on every append.
const ensuredTabs = new Set<string>();

async function ensureSheetTabExists(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
): Promise<void> {
  const cacheKey = `${spreadsheetId}:${sheetName}`;
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
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteSheetName(sheetName)}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [HEADER_ROW] },
    });
  }

  ensuredTabs.add(cacheKey);
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildRowValues(row: PaidRegistrationRow): string[] {
  return [
    row.studentName,
    row.fatherName ?? "",
    row.email,
    row.phone,
    row.cnic ?? "",
    row.gender,
    row.dateOfBirth ? toDateOnly(row.dateOfBirth) : "",
    row.program,
    row.batch,
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
  ];
}

const APPEND_MAX_ATTEMPTS = 3;
const APPEND_RETRY_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Appends a paid registration as a row in the configured Google Sheet.
 * Retries transient failures a few times before giving up - the caller
 * (services/payment.service.ts) treats a thrown error here as non-fatal to
 * the payment confirmation and records it on the registration for a manual
 * admin retry instead.
 */
export async function appendPaidRegistrationRow(row: PaidRegistrationRow): Promise<void> {
  const env = getEnv();
  const sheets = getSheetsClient();

  let lastError: unknown;

  for (let attempt = 1; attempt <= APPEND_MAX_ATTEMPTS; attempt++) {
    try {
      await ensureSheetTabExists(sheets, env.GOOGLE_SHEETS_SPREADSHEET_ID, env.GOOGLE_SHEETS_SHEET_NAME);

      await sheets.spreadsheets.values.append({
        spreadsheetId: env.GOOGLE_SHEETS_SPREADSHEET_ID,
        range: `${quoteSheetName(env.GOOGLE_SHEETS_SHEET_NAME)}!A:A`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [buildRowValues(row)] },
      });

      console.log(`[Sheets] Appended row basketId=${row.basketId} attempt=${attempt}`);
      return;
    } catch (error) {
      lastError = error;
      console.error(`[Sheets] Append attempt ${attempt}/${APPEND_MAX_ATTEMPTS} failed basketId=${row.basketId}`, error);
      if (attempt < APPEND_MAX_ATTEMPTS) {
        await sleep(APPEND_RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to append registration to Google Sheet");
}
