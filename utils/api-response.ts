import { NextResponse } from "next/server";

export function apiError(message: string, status: number, details?: unknown) {
  return NextResponse.json({ success: false, error: message, details }, { status });
}

export function apiSuccess<T extends object>(data: T, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}
