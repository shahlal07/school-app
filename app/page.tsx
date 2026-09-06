import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/session";

export default async function HomePage() {
  const profile = await getCurrentProfile();

  if (!profile || !profile.is_active) {
    redirect("/login");
  }

  redirect(profile.role === "owner" ? "/owner" : "/teacher");
}
