import type { sheets_v4 } from "googleapis";
import { getEnv } from "@/config/env";
import { getSheetsClient } from "@/lib/google/sheets-client";

export interface PaidRegistrationRow {
  basketId: string;
  studentName: string;
  fatherName: string | null;
  email: string;
  phone: string;
  cnic: string | null;
  gender: string;
  program: string;
  batch: string;
  campus: string;
  session: string;
  country: string;
  city: string;
  address: string;
  paymentMethod: string | null;
  transactionId: string | null;
  amountPaid: number;
  paymentDate: Date;
}

const HEADER_ROW = [
  "Basket ID",
  "Student Name",
  "Father Name",
  "Email",
  "Phone",
  "CNIC",
  "Gender",
  "Program",
  "Batch",
  "Campus",
  "Session",
  "Country",
  "City",
  "Address",
  "Payment Method",
  "Transaction ID",
  "Amount Paid",
  "Payment Date",
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

export async function appendPaidRegistrationRow(row: PaidRegistrationRow): Promise<void> {
  const env = getEnv();
  const sheets = getSheetsClient();

  await ensureSheetTabExists(sheets, env.GOOGLE_SHEETS_SPREADSHEET_ID, env.GOOGLE_SHEETS_SHEET_NAME);

  await sheets.spreadsheets.values.append({
    spreadsheetId: env.GOOGLE_SHEETS_SPREADSHEET_ID,
    range: `${quoteSheetName(env.GOOGLE_SHEETS_SHEET_NAME)}!A:A`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [
        [
          row.basketId,
          row.studentName,
          row.fatherName ?? "",
          row.email,
          row.phone,
          row.cnic ?? "",
          row.gender,
          row.program,
          row.batch,
          row.campus,
          row.session,
          row.country,
          row.city,
          row.address,
          row.paymentMethod ?? "",
          row.transactionId ?? "",
          row.amountPaid.toFixed(2),
          row.paymentDate.toISOString(),
        ],
      ],
    },
  });
}
