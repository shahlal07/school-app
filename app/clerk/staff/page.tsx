import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

import { StaffListClient } from "./staff-list-client";

export default async function ClerkStaffPage() {
  const supabase = createClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "teacher")
    .order("full_name", { ascending: true });

  const teachers = (data as Profile[] | null) ?? [];

  return (
    <main className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">Staff</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Teaching-staff records: designation and joining date.
      </p>

      <div className="mt-5">
        <StaffListClient teachers={teachers} />
      </div>
    </main>
  );
}
