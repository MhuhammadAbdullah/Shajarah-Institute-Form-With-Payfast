import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listCampusesForProgram } from "@/services/programCampus.service";
import { listSessionsForProgram } from "@/services/programSession.service";

/**
 * Given a program NAME, returns only the Campuses/Sessions actually
 * associated with it (active only) - the wizard calls this whenever
 * `program` changes and uses the result in place of the page-load-time
 * static campus/session lists for those two selects specifically.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const program = searchParams.get("program");

  if (!program) {
    return NextResponse.json({ success: false, error: "program is required" }, { status: 400 });
  }

  const programRow = await prisma.program.findUnique({ where: { name: program } });
  if (!programRow) {
    return NextResponse.json({ success: false, error: "Unknown program" }, { status: 404 });
  }

  const [campuses, sessions] = await Promise.all([
    listCampusesForProgram(programRow.id),
    listSessionsForProgram(programRow.id),
  ]);

  return NextResponse.json({
    success: true,
    campuses: campuses.filter((c) => c.isActive).map((c) => c.name),
    sessions: sessions.filter((s) => s.isActive).map((s) => s.name),
  });
}
