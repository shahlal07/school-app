import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getFullExamSetReport } from "@/lib/examination/exam-set-report-data";
import { buildExamSetWorkbook } from "@/lib/reports/exam-set-workbook";

/**
 * Streams the printable Excel workbook (Phase E) for one completed exam
 * set. A route handler, not a server action, since a server action can't
 * cleanly return a binary xlsx response for the browser to save.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active || !["owner", "academic_coordinator"].includes(profile.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = createClient();
  const full = await getFullExamSetReport(supabase, params.id);

  if (!full) {
    return NextResponse.json({ error: "Exam set not found." }, { status: 404 });
  }
  if (full.examSet.status !== "completed" || !full.report) {
    return NextResponse.json(
      { error: "This exam set isn't completed yet - the workbook is only available once every subject is finalized." },
      { status: 409 }
    );
  }

  const schoolSettingRes = await supabase
    .from("school_settings")
    .select("value")
    .eq("key", "school_name")
    .maybeSingle();
  const schoolName = (schoolSettingRes.data?.value as string | undefined) ?? "School OS";

  const buffer = await buildExamSetWorkbook(
    {
      schoolName,
      className: full.klass?.name ?? "Unknown class",
      setNumber: full.examSet.set_number,
      assessmentScope: full.examSet.assessment_scope,
      startedOn: full.examSet.started_on,
      completedOn: full.examSet.completed_on,
      finalizedByName: profile.full_name,
      generatedAt: new Date()
    },
    full.report,
    full.subjectSlots,
    full.studentInputs,
    full.resultInputs
  );

  const filename = `Exam_Set_${String(full.examSet.set_number).padStart(3, "0")}_${(full.klass?.name ?? "class").replace(/[^a-zA-Z0-9-]+/g, "_")}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
