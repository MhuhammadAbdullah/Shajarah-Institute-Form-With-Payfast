import { google, sheets_v4 } from "googleapis";
import { getEnv } from "@/config/env";

let cachedClient: sheets_v4.Sheets | undefined;

export function getSheetsClient(): sheets_v4.Sheets {
  if (cachedClient) return cachedClient;

  const env = getEnv();
  const auth = new google.auth.JWT({
    email: env.GOOGLE_SHEETS_CLIENT_EMAIL,
    // .env stores the key with literal "\n" sequences; restore real newlines.
    key: env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  cachedClient = google.sheets({ version: "v4", auth });
  return cachedClient;
}
