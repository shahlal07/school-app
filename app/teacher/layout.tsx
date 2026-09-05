import { requireRole } from "@/lib/auth/session";
import { TeacherShell } from "@/components/shared/teacher-shell";

export default async function TeacherLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("teacher");
  return <TeacherShell teacherName={profile.full_name}>{children}</TeacherShell>;
}
