import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/get-translator";
import type { Profile } from "@/types/database";
import { StaffDirectoryClient } from "./staff-directory-client";

export default async function ClerkStaffPage() {
  const supabase = createClient();
  const t = await getT();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["teacher", "principal", "academic_coordinator", "clerk"])
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });
  const profiles = (data as Profile[] | null) ?? [];

  return <main className="p-4 sm:p-6">
    <h1 className="text-xl font-semibold text-neutral-900">{t("clerk.staff.title")}</h1>
    <p className="mt-1 text-sm text-neutral-500">Complete staff directory — usernames, contact numbers, designations and employment status.</p>
    <div className="mt-5"><StaffDirectoryClient profiles={profiles} /></div>
  </main>;
}
