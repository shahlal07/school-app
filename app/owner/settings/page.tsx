import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const supabase = createClient();

  const [settingRes, staffRes, classesRes, subjectsRes] = await Promise.all([
    supabase
      .from("school_settings")
      .select("value")
      .eq("key", "pass_percentage")
      .maybeSingle(),
    supabase.from("profiles").select("id, role, is_active"),
    supabase.from("classes").select("id, name"),
    supabase.from("subjects").select("id")
  ]);

  const initialPassPercentage = settingRes.data?.value
    ? Number(settingRes.data.value)
    : 33;
  const staff = staffRes.data ?? [];
  const activeStaff = staff.filter((person) => person.is_active).length;
  const teachers = staff.filter(
    (person) => person.role === "teacher" && person.is_active
  ).length;

  return (
    <SettingsClient
      initialPassPercentage={initialPassPercentage}
      schoolStats={{
        activeStaff,
        teachers,
        classes: classesRes.data?.length ?? 0,
        subjects: subjectsRes.data?.length ?? 0
      }}
    />
  );
}
