import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/session";
import { ROLE_HOME_PATH } from "@/lib/auth/roles";

export default async function HomePage() {
  const profile = await getCurrentProfile();

  if (!profile || !profile.is_active) {
    redirect("/login");
  }

  redirect(ROLE_HOME_PATH[profile.role]);
}
