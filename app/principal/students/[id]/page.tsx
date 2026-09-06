import { StudentResultCard } from "@/components/examination/student-result-card";

// Auth is inherited from app/principal/layout.tsx's requireAnyRole(["owner",
// "principal"]) guard - principal has can_view_school_wide() read access to
// test_results, same query the owner's result card uses.
export default async function PrincipalStudentResultCardPage({
  params
}: {
  params: { id: string };
}) {
  return <StudentResultCard studentId={params.id} backHref="/principal/students" />;
}
