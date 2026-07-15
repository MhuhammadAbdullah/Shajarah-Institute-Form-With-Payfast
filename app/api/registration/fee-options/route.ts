import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findActiveFeeStructure, computeFee } from "@/services/feeStructure.service";

/**
 * Given the program/campus/session NAMES the customer selected (same
 * strings that end up in Registration.program/campus/session) and a
 * quantity (participant count for Multiple registration, else 1), returns
 * the resolved fee breakdown - exact match only, no fallback/substitution,
 * matching services/registration.service.ts:resolveFee. Called by the
 * wizard's live fee panel whenever any of the selects or the participant
 * count changes.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const program = searchParams.get("program");
  const campus = searchParams.get("campus");
  const session = searchParams.get("session");
  const quantity = Math.max(1, Number(searchParams.get("quantity")) || 1);

  if (!program || !campus || !session) {
    return NextResponse.json({ success: false, error: "program, campus, and session are all required" }, { status: 400 });
  }

  const [programRow, campusRow, sessionRow] = await Promise.all([
    prisma.program.findUnique({ where: { name: program } }),
    prisma.campus.findUnique({ where: { name: campus } }),
    prisma.session.findUnique({ where: { name: session } }),
  ]);

  if (!programRow || !campusRow || !sessionRow) {
    return NextResponse.json({ success: false, error: "No fee available for this combination" }, { status: 404 });
  }

  const feeStructure = await findActiveFeeStructure(programRow.id, campusRow.id, sessionRow.id);
  if (!feeStructure) {
    return NextResponse.json({ success: false, error: "No fee available for this combination" }, { status: 404 });
  }

  const breakdown = await computeFee(feeStructure.id, quantity);

  return NextResponse.json({ success: true, ...breakdown });
}
