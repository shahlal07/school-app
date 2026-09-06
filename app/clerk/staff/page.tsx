import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/get-translator";
import type { Profile } from "@/types/database";

import { StaffListClient } from "./staff-list-client";

export default async function ClerkStaffPage() {
  const supabase = createClient();
  const t = await getT();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "teacher")
    .order("full_name", { ascending: true });

  const teachers = (data as Profile[] | null) ?? [];

  return (
    <main className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">{t("clerk.staff.title")}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t("clerk.staff.subtitle")}</p>

      <div className="mt-5">
        <StaffListClient teachers={teachers} />
      </div>
    </main>
  );
}
