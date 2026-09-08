import { createClient } from "@/lib/supabase/server";
import { OwnerStaffOverview } from "@/components/owner/owner-staff-overview";
import type { Profile } from "@/types/database";
import type { Class } from "@/types/examination";

type Assignment = {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string;
};

export default async function TeachersPage() {
  const supabase = createClient();

  const [staffRes, classesRes, assignmentsRes] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name", { ascending: true }),
    supabase.from("classes").select("*"),
    supabase.from("teacher_subjects").select("id, teacher_id, subject_id, class_id")
  ]);

  const staff = (staffRes.data as Profile[] | null) ?? [];
  const classes = (classesRes.data as Class[] | null) ?? [];
  const assignments = (assignmentsRes.data as Assignment[] | null) ?? [];

  return (
    <main className="p-4 sm:p-6">
      <OwnerStaffOverview staff={staff} classes={classes} assignments={assignments} />
    </main>
  );
}
