import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("school_settings")
    .select("value")
    .eq("key", "pass_percentage")
    .maybeSingle();

  const initialPassPercentage = data?.value ? Number(data.value) : 33;

  return <SettingsClient initialPassPercentage={initialPassPercentage} />;
}
