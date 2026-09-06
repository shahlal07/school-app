import type { Class, Student, Subject } from "@/types/examination";
import type { createClient } from "@/lib/supabase/server";
import {
  computeExamSetReport,
  type ExamSetReport,
  type ExamSetSubjectSlot,
  type ResultInput,
  type StudentInput
} from "@/lib/examination/exam-set-analytics";

export type ExamSetStatus = "planned" | "active" | "awaiting_completion" | "completed" | "cancelled";

export interface ExamSetRow {
  id: string;
  class_id: string;
  set_number: number;
  status: ExamSetStatus;
  assessment_scope: string;
  started_on: string | null;
  completed_on: string | null;
}

interface ExamSetSubjectRow {
  id: string;
  exam_set_id: string;
  subject_id: string;
  sequence: number;
  scheduled_date: string | null;
  schedule_item_id: string | null;
}

interface ScheduleItemStatusRow {
  id: string;
  status: string;
}

interface TeacherSubjectRow {
  teacher_id: string;
  subject_id: string;
}

interface ProfileRow {
  user_id: string;
  full_name: string;
  role: string;
}

interface TestResultRow {
  schedule_item_id: string;
  student_id: string;
  marks_obtained: number | null;
  total_marks: number;
  is_absent: boolean;
  is_pass: boolean | null;
}

type SupabaseClient = ReturnType<typeof createClient>;

async function buildReportForSet(
  supabase: SupabaseClient,
  examSetId: string,
  subjectsById: Map<string, Subject>,
  teacherNameBySubjectId: Map<string, string>
): Promise<{
  subjectSlots: ExamSetSubjectSlot[];
  resultInputs: ResultInput[];
  examSetSubjects: ExamSetSubjectRow[];
}> {
  const examSetSubjectsRes = await supabase
    .from("exam_set_subjects")
    .select("id,exam_set_id,subject_id,sequence,scheduled_date,schedule_item_id")
    .eq("exam_set_id", examSetId)
    .order("sequence", { ascending: true });

  const examSetSubjects = (examSetSubjectsRes.data as ExamSetSubjectRow[] | null) ?? [];
  const scheduleItemIds = examSetSubjects
    .map((row) => row.schedule_item_id)
    .filter((id): id is string => Boolean(id));

  const resultsRes =
    scheduleItemIds.length > 0
      ? await supabase
          .from("test_results")
          .select("schedule_item_id,student_id,marks_obtained,total_marks,is_absent,is_pass")
          .in("schedule_item_id", scheduleItemIds)
      : { data: [] as TestResultRow[] };

  const results = (resultsRes.data as TestResultRow[] | null) ?? [];

  const subjectSlots: ExamSetSubjectSlot[] = examSetSubjects.map((row) => {
    const subject = subjectsById.get(row.subject_id);
    return {
      subjectId: row.subject_id,
      subjectName: subject?.name ?? "Unknown subject",
      sequence: row.sequence,
      scheduledDate: row.scheduled_date,
      scheduleItemId: row.schedule_item_id,
      teacherId: null,
      teacherName: teacherNameBySubjectId.get(row.subject_id) ?? null
    };
  });

  const resultInputs: ResultInput[] = results.map((r) => ({
    scheduleItemId: r.schedule_item_id,
    studentId: r.student_id,
    marksObtained: r.marks_obtained,
    totalMarks: r.total_marks,
    isAbsent: r.is_absent,
    isPass: r.is_pass
  }));

  return { subjectSlots, resultInputs, examSetSubjects };
}

export interface FullExamSetReport {
  examSet: ExamSetRow;
  klass: Class | null;
  totalSubjectSlots: number;
  completedSubjectSlots: number;
  prevSet: ExamSetRow | null;
  subjectSlots: ExamSetSubjectSlot[];
  resultInputs: ResultInput[];
  studentInputs: StudentInput[];
  report: ExamSetReport | null;
}

/**
 * Everything app/coordinator/exam-sets/[id]/page.tsx needs, in one place, so
 * the printable-workbook API route (lib/reports/exam-set-workbook.ts's
 * caller) computes the exact same numbers rather than a second, potentially
 * drifting implementation. `report` is null (and subjectSlots/resultInputs/
 * studentInputs are still populated for the in-progress-summary UI) whenever
 * the set isn't 'completed' yet - callers must show an honest in-progress
 * state, never a partial/fabricated report.
 */
export async function getFullExamSetReport(
  supabase: SupabaseClient,
  examSetId: string
): Promise<FullExamSetReport | null> {
  const examSetRes = await supabase
    .from("exam_sets")
    .select("id,class_id,set_number,status,assessment_scope,started_on,completed_on")
    .eq("id", examSetId)
    .maybeSingle();

  const examSet = examSetRes.data as ExamSetRow | null;
  if (!examSet) return null;

  const [classRes, subjectsRes, examSetSubjectsRes, scheduleItemsRes] = await Promise.all([
    supabase.from("classes").select("*").eq("id", examSet.class_id).maybeSingle(),
    supabase.from("subjects").select("*").eq("class_id", examSet.class_id),
    supabase
      .from("exam_set_subjects")
      .select("id,exam_set_id,subject_id,sequence,scheduled_date,schedule_item_id")
      .eq("exam_set_id", examSet.id)
      .order("sequence", { ascending: true }),
    supabase.from("schedule_items").select("id,status")
  ]);

  const klass = classRes.data as Class | null;
  const subjects = (subjectsRes.data as Subject[] | null) ?? [];
  const examSetSubjects = (examSetSubjectsRes.data as ExamSetSubjectRow[] | null) ?? [];
  const scheduleItems = (scheduleItemsRes.data as ScheduleItemStatusRow[] | null) ?? [];

  const subjectsById = new Map(subjects.map((s) => [s.id, s]));
  const scheduleItemStatusById = new Map(scheduleItems.map((si) => [si.id, si.status]));

  const subjectIds = examSetSubjects.map((row) => row.subject_id);
  const [teacherSubjectsRes, teacherProfilesRes] = await Promise.all([
    subjectIds.length > 0
      ? supabase.from("teacher_subjects").select("teacher_id,subject_id").in("subject_id", subjectIds)
      : Promise.resolve({ data: [] as TeacherSubjectRow[] }),
    supabase.from("profiles").select("user_id,full_name,role").eq("role", "teacher")
  ]);

  const teacherSubjects = (teacherSubjectsRes.data as TeacherSubjectRow[] | null) ?? [];
  const teacherProfiles = (teacherProfilesRes.data as ProfileRow[] | null) ?? [];
  const teacherNameByUserId = new Map(teacherProfiles.map((t) => [t.user_id, t.full_name]));
  const teacherNameBySubjectId = new Map<string, string>();
  for (const ts of teacherSubjects) {
    if (teacherNameBySubjectId.has(ts.subject_id)) continue;
    const name = teacherNameByUserId.get(ts.teacher_id);
    if (name) teacherNameBySubjectId.set(ts.subject_id, name);
  }

  const totalSubjectSlots = examSetSubjects.length;
  const completedSubjectSlots = examSetSubjects.filter((row) => {
    const status = row.schedule_item_id ? scheduleItemStatusById.get(row.schedule_item_id) : null;
    return status === "completed";
  }).length;

  if (examSet.status !== "completed") {
    return {
      examSet,
      klass,
      totalSubjectSlots,
      completedSubjectSlots,
      prevSet: null,
      subjectSlots: [],
      resultInputs: [],
      studentInputs: [],
      report: null
    };
  }

  const studentsRes = await supabase
    .from("students")
    .select("id,class_id,section_id,roll_no,name,is_active")
    .eq("class_id", examSet.class_id)
    .eq("is_active", true);
  const students = (studentsRes.data as Student[] | null) ?? [];
  const studentInputs: StudentInput[] = students.map((s) => ({
    studentId: s.id,
    name: s.name,
    rollNo: s.roll_no
  }));

  const { subjectSlots, resultInputs } = await buildReportForSet(
    supabase,
    examSet.id,
    subjectsById,
    teacherNameBySubjectId
  );

  const prevSetRes = await supabase
    .from("exam_sets")
    .select("id,class_id,set_number,status,assessment_scope,started_on,completed_on")
    .eq("class_id", examSet.class_id)
    .eq("status", "completed")
    .lt("set_number", examSet.set_number)
    .order("set_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevSet = prevSetRes.data as ExamSetRow | null;

  let previousSetSubjectAverages: Record<string, number> | undefined;
  if (prevSet) {
    const prevStudentsRes = await supabase
      .from("students")
      .select("id,class_id,section_id,roll_no,name,is_active")
      .eq("class_id", prevSet.class_id)
      .eq("is_active", true);
    const prevStudents = (prevStudentsRes.data as Student[] | null) ?? [];
    const prevStudentInputs: StudentInput[] = prevStudents.map((s) => ({
      studentId: s.id,
      name: s.name,
      rollNo: s.roll_no
    }));

    const { subjectSlots: prevSubjectSlots, resultInputs: prevResultInputs } = await buildReportForSet(
      supabase,
      prevSet.id,
      subjectsById,
      teacherNameBySubjectId
    );

    const prevReport = computeExamSetReport(prevSubjectSlots, prevStudentInputs, prevResultInputs);
    previousSetSubjectAverages = {};
    for (const s of prevReport.subjects) {
      if (s.average !== null) previousSetSubjectAverages[s.subjectId] = s.average;
    }
  }

  const report = computeExamSetReport(subjectSlots, studentInputs, resultInputs, previousSetSubjectAverages);

  return {
    examSet,
    klass,
    totalSubjectSlots,
    completedSubjectSlots,
    prevSet,
    subjectSlots,
    resultInputs,
    studentInputs,
    report
  };
}
