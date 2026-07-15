import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { uploadRegistrationFile, StorageNotConfiguredError } from "@/lib/supabase/storage";

const UPLOAD_RATE_LIMIT = 10;
const UPLOAD_RATE_WINDOW_MS = 60_000;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`upload:${ip}`, UPLOAD_RATE_LIMIT, UPLOAD_RATE_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json({ success: false, error: "Too many uploads. Please try again in a minute." }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ success: false, error: "File must be smaller than 10MB" }, { status: 413 });
  }

  try {
    const url = await uploadRegistrationFile(file);
    return NextResponse.json({ success: true, url });
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      console.error("[Uploads] Storage not configured:", error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 503 });
    }
    console.error("[Uploads] Upload failed", error);
    return NextResponse.json({ success: false, error: "Failed to upload file" }, { status: 502 });
  }
}
