import { StudentResultCard } from "@/components/examination/student-result-card";

// This page owns guarding nothing itself - app/owner/layout.tsx already
// wraps every /owner/** route (this one included) in requireRole("owner"),
// same as app/owner/students/page.tsx relies on.
export default async function OwnerStudentResultCardPage({
  params
}: {
  params: { id: string };
}) {
  return <StudentResultCard studentId={params.id} backHref="/owner/students" />;
}
