import { requireRole } from "@/lib/auth/session";

export default async function OwnerLayout({
  children
}: {
  children: React.ReactNode;
}) {
  await requireRole("owner");
  return <>{children}</>;
}
