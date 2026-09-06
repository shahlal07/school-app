import { requireAnyRole } from "@/lib/auth/session";
import { TeacherShell } from "@/components/shared/teacher-shell";

/**
 * Widened beyond "teacher" so owner/principal/academic_coordinator can
 * actually follow the "view this exam's results" links their own
 * Results/Reports pages already render (app/owner/results/page.tsx,
 * app/principal/results/page.tsx both link to /teacher/exams/<id>) - before
 * this, that link was a dead end for every non-teacher role, since this
 * layout redirected them away before the page ever rendered. Every write
 * action reachable from here (saveTestResults, submitPaper, etc.) has its
 * own independent requireRole/RLS check unaffected by this layout guard, so
 * this only fixes read-reachability, it does not widen who can write.
 */
export default async function TeacherLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAnyRole(["teacher", "owner", "principal", "academic_coordinator"]);
  return <TeacherShell teacherName={profile.full_name}>{children}</TeacherShell>;
}
