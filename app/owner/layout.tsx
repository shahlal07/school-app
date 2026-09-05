import { requireRole } from "@/lib/auth/session";
import { OwnerShell } from "@/components/shared/owner-shell";

export default async function OwnerLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("owner");
  return <OwnerShell ownerName={profile.full_name}>{children}</OwnerShell>;
}
