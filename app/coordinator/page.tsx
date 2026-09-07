import Link from "next/link";

import type { Profile } from "@/types/database";
import type { Class, Subject } from "@/types/examination";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { classOrderIndex } from "@/components/examination/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getT } from "@/lib/i18n/get-translator";
import { Bdi } from "@/components/shared/bdi";
import { pakistanDate, getStaffAttendance } from "@/lib/attendance/report";
import { getAttendanceAcademicSignals } from "@/lib/attendance/integration";
import { PlainStatTile } from "@/components/shared/dashboard-charts";
import { AttendanceOverviewToggle, type AttendanceAggregate } from "@/components/coordinator/attendance-overview-toggle";
import type { DailyAttendanceReportRow } from "@/types/attendance";

interface ScheduleItemRow {
  id: string;
  class_id: string;
  subject_id: string;
  topic_id: string | null;
  teacher_id: string | null;
  status: string;
  scheduled_date: string;
}

interface ExamPaperRow {
  schedule_item_id: string;
  status: string;
}

interface TeacherSubjectRow {
  teacher_id: string;
  subject_id: string;
}

interface ChapterRow {
  id: string;
  subject_id: string;
}

interface TopicRow {
  id: string;
  chapter_id: string;
}

interface TestResultRow {
  schedule_item_id: string;
  is_pass: boolean | null;
  is_absent: boolean;
}

const MIN_TOPIC_SAMPLE_SIZE = 3;
const WEAK_TOPIC_LIMIT = 5;

/**
 * Academic Coordinator's flagship dashboard - the one genuinely new page in
 * this phase. Every section below is backed by a real query against the
 * live schema (no placeholder/mock data):
 *
 *  1. Teacher activity: papers submitted vs. scheduled per teacher - same
 *     aggregation shape as app/owner/reports/page.tsx's teacherCompliance.
 *  2. Syllabus progress per class/subject: topics that have at least one
 *     "completed" schedule_item vs. total topics for that subject - built
 *     from the same chapters/topics/schedule_items relationships used by
 *     app/owner/performance/page.tsx.
 *  3. Exam control counts: upcoming exams, schedule items with no exam
 *     paper filed yet, and graded-but-unresolved test_results rows - reusing
 *     the queue-bucketing logic from app/owner/papers/page.tsx and the
 *     is_pass/is_absent semantics from app/owner/results/page.tsx.
 *  4. At-risk students: weak-topic pass-rate aggregation, same pattern (and
 *     MIN_TOPIC_SAMPLE_SIZE threshold) as app/owner/performance/page.tsx.
 *     This app is genuinely new with little seeded test_results data, so an
 *     honest empty state (via <EmptyState/>) is expected and correct here,
 *     not a bug.
 */
export default async function CoordinatorDashboardPage() {
  const supabase = createClient();
  const t = await getT();
  const profile = await getCurrentProfile();

  const todayIso = pakistanDate();
  const thirtyDaysAgo = new Date(`${todayIso}T00:00:00+05:00`);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const thirtyDaysAgoIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(thirtyDaysAgo);
  const sevenDaysAgo = new Date(`${todayIso}T00:00:00+05:00`);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(sevenDaysAgo);

  const [
    classesRes,
    subjectsRes,
    chaptersRes,
    topicsRes,
    scheduleItemsRes,
    examPapersRes,
    teachersRes,
    teacherSubjectsRes,
    testResultsRes,
    attendanceReportRes,
    sectionsCountRes,
    submittedTodayRes,
    staffAttendance,
    riskSignals,
    recentSessionsRes,
    recentResolvedRes
  ] = await Promise.all([
    supabase.from("classes").select("*"),
    supabase.from("subjects").select("*"),
    supabase.from("chapters").select("id, subject_id"),
    supabase.from("topics").select("id, chapter_id"),
    supabase
      .from("schedule_items")
      .select("id, class_id, subject_id, topic_id, teacher_id, status, scheduled_date"),
    supabase.from("exam_papers").select("schedule_item_id, status"),
    supabase.from("profiles").select("*").eq("role", "teacher"),
    supabase.from("teacher_subjects").select("teacher_id, subject_id"),
    supabase.from("test_results").select("schedule_item_id, is_pass, is_absent"),
    supabase
      .from("attendance_daily_report")
      .select("attendance_date, present_count, absent_count, late_count, excused_count")
      .gte("attendance_date", thirtyDaysAgoIso)
      .lte("attendance_date", todayIso),
    supabase.from("sections").select("id", { count: "exact", head: true }),
    supabase.from("attendance_sessions").select("id", { count: "exact", head: true }).eq("attendance_date", todayIso).eq("status", "submitted"),
    getStaffAttendance(todayIso),
    getAttendanceAcademicSignals(50),
    supabase
      .from("attendance_sessions")
      .select("id, class_id, section_id, attendance_date")
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false })
      .limit(2),
    supabase.from("alerts").select("id, message, resolved_at").eq("status", "resolved").order("resolved_at", { ascending: false }).limit(2)
  ]);

  const classes = ((classesRes.data as Class[] | null) ?? [])
    .slice()
    .sort((a, b) => classOrderIndex(a.name) - classOrderIndex(b.name));
  const subjects = (subjectsRes.data as Subject[] | null) ?? [];
  const chapters = (chaptersRes.data as ChapterRow[] | null) ?? [];
  const topics = (topicsRes.data as TopicRow[] | null) ?? [];
  const scheduleItems = (scheduleItemsRes.data as ScheduleItemRow[] | null) ?? [];
  const examPapers = (examPapersRes.data as ExamPaperRow[] | null) ?? [];
  const teachers = (teachersRes.data as Profile[] | null) ?? [];
  const teacherSubjects = (teacherSubjectsRes.data as TeacherSubjectRow[] | null) ?? [];
  const testResults = (testResultsRes.data as TestResultRow[] | null) ?? [];

  const classById = new Map(classes.map((c) => [c.id, c]));
  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const chapterById = new Map(chapters.map((c) => [c.id, c]));
  const paperStatusByScheduleItem = new Map(examPapers.map((p) => [p.schedule_item_id, p.status]));

  // ---- 1. Teacher activity: papers submitted vs. scheduled, per teacher ----
  const teacherActivity = teachers.map((teacher) => {
    const assignedSubjectIds = new Set(
      teacherSubjects.filter((ts) => ts.teacher_id === teacher.user_id).map((ts) => ts.subject_id)
    );
    const relevantItems = scheduleItems.filter(
      (item) => assignedSubjectIds.has(item.subject_id) && item.status !== "cancelled"
    );
    const papersSubmitted = relevantItems.filter((item) => {
      const status = paperStatusByScheduleItem.get(item.id);
      return status && status !== "not_started" && status !== "draft";
    }).length;
    return {
      teacher,
      scheduled: relevantItems.length,
      papersSubmitted
    };
  });

  // ---- 2. Syllabus progress per class/subject ----
  // "Covered" = the topic has at least one schedule_item whose test has
  // actually been conducted (status = 'completed').
  const topicsBySubject = new Map<string, TopicRow[]>();
  for (const chapter of chapters) {
    const chapterTopics = topics.filter((t) => t.chapter_id === chapter.id);
    const existing = topicsBySubject.get(chapter.subject_id) ?? [];
    topicsBySubject.set(chapter.subject_id, existing.concat(chapterTopics));
  }

  const coveredTopicIds = new Set(
    scheduleItems
      .filter((item) => item.status === "completed" && item.topic_id)
      .map((item) => item.topic_id as string)
  );

  const syllabusProgressByClass = classes
    .map((klass) => {
      const classSubjects = subjects.filter((s) => s.class_id === klass.id);
      const subjectProgress = classSubjects.map((subject) => {
        const subjectTopics = topicsBySubject.get(subject.id) ?? [];
        const covered = subjectTopics.filter((t) => coveredTopicIds.has(t.id)).length;
        return { subject, total: subjectTopics.length, covered };
      });
      return { klass, subjectProgress: subjectProgress.filter((sp) => sp.total > 0) };
    })
    .filter((entry) => entry.subjectProgress.length > 0);

  // ---- 3. Exam control counts ----
  const upcomingExams = scheduleItems.filter(
    (item) =>
      (item.status === "upcoming" || item.status === "scheduled") &&
      item.scheduled_date >= todayIso
  ).length;

  const missingPapers = scheduleItems.filter((item) => {
    if (item.status === "cancelled") return false;
    const status = paperStatusByScheduleItem.get(item.id);
    return !status || status === "not_started";
  }).length;

  const unmarkedResults = testResults.filter(
    (result) => result.is_pass === null && !result.is_absent
  ).length;

  // ---- 4. At-risk students: weak-topic pass rate ----
  interface PassAcc {
    passed: number;
    total: number;
  }
  const topicAcc = new Map<string, PassAcc>();
  const gradedResults = testResults.filter((r) => r.is_pass !== null);
  const scheduleItemById = new Map(scheduleItems.map((item) => [item.id, item]));

  for (const result of gradedResults) {
    const scheduleItem = scheduleItemById.get(result.schedule_item_id);
    if (!scheduleItem?.topic_id) continue;
    const acc = topicAcc.get(scheduleItem.topic_id) ?? { passed: 0, total: 0 };
    acc.total += 1;
    if (result.is_pass) acc.passed += 1;
    topicAcc.set(scheduleItem.topic_id, acc);
  }

  const weakTopics = Array.from(topicAcc.entries())
    .filter(([, acc]) => acc.total >= MIN_TOPIC_SAMPLE_SIZE)
    .map(([topicId, acc]) => {
      const chapter = chapterById.get(
        (topics.find((t) => t.id === topicId) as TopicRow | undefined)?.chapter_id ?? ""
      );
      const subject = chapter ? subjectById.get(chapter.subject_id) : undefined;
      const cls = subject ? classById.get(subject.class_id) : undefined;
      return {
        topicId,
        passRate: acc.total > 0 ? Math.round((acc.passed / acc.total) * 100) : 0,
        total: acc.total,
        subjectName: subject?.name ?? t("coordinator.fallback.unknownSubject"),
        className: cls?.name ?? t("coordinator.fallback.unknownClass")
      };
    })
    .sort((a, b) => a.passRate - b.passRate)
    .slice(0, WEAK_TOPIC_LIMIT);

  const hasAnyGradedResults = gradedResults.length > 0;

  // ---- Attendance Overview: real Today/7-day/30-day aggregates from
  // attendance_daily_report, no fabricated ranges ----
  const attendanceRows = (attendanceReportRes.data as Pick<DailyAttendanceReportRow, "attendance_date" | "present_count" | "absent_count" | "late_count" | "excused_count">[] | null) ?? [];
  const sumAttendance = (rows: typeof attendanceRows): AttendanceAggregate =>
    rows.reduce(
      (acc, r) => ({
        present: acc.present + r.present_count,
        absent: acc.absent + r.absent_count,
        late: acc.late + r.late_count,
        excused: acc.excused + r.excused_count
      }),
      { present: 0, absent: 0, late: 0, excused: 0 }
    );
  const todayAttendance = sumAttendance(attendanceRows.filter((r) => r.attendance_date === todayIso));
  const sevenDayAttendance = sumAttendance(attendanceRows.filter((r) => r.attendance_date >= sevenDaysAgoIso));
  const thirtyDayAttendance = sumAttendance(attendanceRows);
  const todayTotal = todayAttendance.present + todayAttendance.absent + todayAttendance.late + todayAttendance.excused;
  const attendancePct = todayTotal > 0 ? Math.round((todayAttendance.present / todayTotal) * 1000) / 10 : null;

  // ---- Staff Attendance % today ----
  const staffPresentCount = staffAttendance.staff.filter((s) => staffAttendance.existing[s.user_id] === "present").length;
  const staffAttendancePct = staffAttendance.staff.length > 0 ? Math.round((staffPresentCount / staffAttendance.staff.length) * 1000) / 10 : null;

  // ---- Classes Submitted today ----
  const totalSections = sectionsCountRes.count ?? 0;
  const classesSubmittedToday = submittedTodayRes.count ?? 0;

  // ---- Students Needing Attention (real attendance_academic_signal rows) ----
  const studentsNeedingAttention = riskSignals.rows.filter((r) => r.signal !== "normal");

  // ---- Recent Activity: real submitted attendance sessions + resolved alerts ----
  const classNameByIdForActivity = new Map(((classesRes.data as Class[] | null) ?? []).map((c) => [c.id, c.name]));
  type ActivityItem = { id: string; text: string; meta: string; at: string };
  const recentSessions = (recentSessionsRes.data as { id: string; class_id: string; section_id: string; attendance_date: string }[] | null) ?? [];
  const recentResolved = (recentResolvedRes.data as { id: string; message: string; resolved_at: string | null }[] | null) ?? [];
  const coordinatorActivity: ActivityItem[] = [
    ...recentSessions.map((s) => ({
      id: `session-${s.id}`,
      text: "Attendance submitted",
      meta: `${classNameByIdForActivity.get(s.class_id) ?? "—"} · ${s.attendance_date}`,
      at: s.attendance_date
    })),
    ...recentResolved.filter((a) => a.resolved_at).map((a) => ({ id: `alert-${a.id}`, text: "Alert resolved", meta: a.message, at: a.resolved_at as string }))
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 4);

  const firstName = profile?.full_name.split(" ")[0] ?? null;
  const hour = new Date().getUTCHours();
  const greetingWord = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <main className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">
          {greetingWord}{firstName ? <>, <Bdi>{firstName}</Bdi></> : null}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {t("coordinator.dashboard.subtitle")}
        </p>
      </div>

      {/* Attendance / Staff Attendance stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <PlainStatTile label="Attendance" value={attendancePct === null ? "—" : `${attendancePct}%`} />
        <PlainStatTile label="Staff Attendance" value={staffAttendancePct === null ? "—" : `${staffAttendancePct}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Attendance Overview */}
        <Card>
          <CardHeader><CardTitle>Attendance Overview</CardTitle></CardHeader>
          <CardContent>
            {todayTotal === 0 && sevenDayAttendance.present + sevenDayAttendance.absent + sevenDayAttendance.late + sevenDayAttendance.excused === 0 ? (
              <EmptyState title="No attendance submitted yet" description="Once class teachers submit daily attendance, the breakdown will appear here." />
            ) : (
              <AttendanceOverviewToggle
                today={todayAttendance}
                sevenDay={sevenDayAttendance}
                thirtyDay={thirtyDayAttendance}
                labels={{ today: "Today", sevenDay: "7 Days", thirtyDay: "30 Days" }}
              />
            )}
          </CardContent>
        </Card>

        {/* Classes Submitted */}
        <Card>
          <CardHeader><CardTitle>Classes Submitted</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-neutral-900">
              <Bdi>{classesSubmittedToday}</Bdi> / <Bdi>{totalSections}</Bdi>
            </p>
            <p className="mt-1 text-sm text-neutral-500">sections have submitted today&apos;s attendance.</p>
            <Link href="/coordinator/attendance" className="mt-3 inline-block text-xs font-medium text-primary-600 hover:underline">
              View attendance &rarr;
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Students Needing Attention */}
      <Card>
        <CardHeader><CardTitle>Students Needing Attention</CardTitle></CardHeader>
        <CardContent>
          {studentsNeedingAttention.length === 0 ? (
            <EmptyState title={t("intelligence.nothingUrgent")} description="No attendance/academic risk signals right now." />
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-100">
              {studentsNeedingAttention.slice(0, 6).map((row) => (
                <li key={row.student_id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="truncate text-sm text-neutral-700"><Bdi>{row.name}</Bdi></span>
                  <Badge variant={row.signal === "attendance_and_academic" ? "danger" : "warning"}>
                    {row.signal === "attendance_and_academic" ? "High" : "Medium"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Exam control counts */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-5">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {t("coordinator.dashboard.upcomingExams")}
            </p>
            <p className="mt-1 text-2xl font-semibold text-neutral-900">{upcomingExams}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {t("coordinator.dashboard.missingPapers")}
            </p>
            <p className="mt-1 text-2xl font-semibold text-neutral-900">{missingPapers}</p>
            <Link href="/coordinator/papers" className="mt-1 inline-block text-xs text-primary-600 hover:underline">
              {t("coordinator.dashboard.reviewQueue")} &rarr;
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {t("coordinator.dashboard.unmarkedResults")}
            </p>
            <p className="mt-1 text-2xl font-semibold text-neutral-900">{unmarkedResults}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Teacher activity summary */}
        <Card>
          <CardHeader>
            <CardTitle>{t("coordinator.dashboard.teacherActivity")}</CardTitle>
          </CardHeader>
          <CardContent>
            {teachers.length === 0 ? (
              <p className="text-sm text-neutral-500">{t("coordinator.dashboard.noTeachersYet")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {teacherActivity.map(({ teacher, scheduled, papersSubmitted }) => (
                  <li
                    key={teacher.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm"
                  >
                    <span className="truncate font-medium text-neutral-800"><Bdi>{teacher.full_name}</Bdi></span>
                    <Badge
                      variant={
                        scheduled === 0 ? "neutral" : papersSubmitted === scheduled ? "success" : "warning"
                      }
                    >
                      {scheduled === 0 ? (
                        t("coordinator.dashboard.noTestsYet")
                      ) : (
                        <>
                          <Bdi>{`${papersSubmitted} / ${scheduled}`}</Bdi> {t("coordinator.dashboard.papersWord")}
                        </>
                      )}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Syllabus progress per class/subject */}
        <Card>
          <CardHeader>
            <CardTitle>{t("coordinator.dashboard.syllabusProgress")}</CardTitle>
          </CardHeader>
          <CardContent>
            {syllabusProgressByClass.length === 0 ? (
              <EmptyState
                title={t("coordinator.dashboard.nothingToTrackYet")}
                description={t("coordinator.dashboard.nothingToTrackYetDescription")}
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {syllabusProgressByClass.map(({ klass, subjectProgress }) => (
                  <li key={klass.id}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      <Bdi>{klass.name}</Bdi>
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {subjectProgress.map(({ subject, total, covered }) => (
                        <div
                          key={subject.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-1.5 text-sm"
                        >
                          <span className="truncate text-neutral-700"><Bdi>{subject.name}</Bdi></span>
                          <Badge variant={covered === total && total > 0 ? "success" : "neutral"}>
                            <Bdi>{`${covered} / ${total}`}</Bdi> {t("coordinator.dashboard.topicsWord")}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* At-risk students (weak-topic pass rate) */}
      <Card>
        <CardHeader>
          <CardTitle>{t("coordinator.dashboard.atRiskTopics")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasAnyGradedResults ? (
            <EmptyState
              title={t("coordinator.dashboard.noGradedResultsYet")}
              description={t("coordinator.dashboard.noGradedResultsYetDescription")}
            />
          ) : weakTopics.length === 0 ? (
            <p className="text-sm text-neutral-500">
              {t("coordinator.dashboard.noWeakTopics")}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {weakTopics.map((wt) => (
                <li
                  key={wt.topicId}
                  className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-800">
                      <Bdi>{wt.subjectName}</Bdi> &middot; <Bdi>{wt.className}</Bdi>
                    </p>
                    <p className="text-xs text-neutral-500"><Bdi>{wt.total}</Bdi> {t("coordinator.dashboard.gradedAttemptsWord")}</p>
                  </div>
                  <Badge variant={wt.passRate < 50 ? "danger" : "warning"}><Bdi>{wt.passRate}%</Bdi> {t("coordinator.dashboard.passWord")}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
        <CardContent>
          {coordinatorActivity.length === 0 ? (
            <EmptyState title="Nothing to show yet" description="Submitted attendance and resolved alerts will appear here." />
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-100">
              {coordinatorActivity.map((item) => (
                <li key={item.id} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-success-500" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900">{item.text}</p>
                    <p className="truncate text-xs text-neutral-500"><Bdi>{item.meta}</Bdi></p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
