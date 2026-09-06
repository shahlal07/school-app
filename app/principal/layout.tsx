import { requireAnyRole } from "@/lib/auth/session";
import { RoleShell } from "@/components/shared/role-shell";

/**
 * Principal segment guard. Allows "owner" in addition to "principal" so the
 * owner can preview the principal's dashboard non-destructively (mirrors how
 * /owner/* already lets only "owner" in - this is the one segment that
 * intentionally widens that to let the supreme-authority role look at any
 * subordinate's view). A principal hitting this layout when signed in as any
 * other role is bounced to their own home via requireAnyRole, never to
 * /login while already signed in.
 */
export default async function PrincipalLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAnyRole(["owner", "principal"]);

  return (
    <RoleShell
      userName={profile.full_name}
      brandLabel="Principal"
      homeHref="/principal"
      sidebarItems={[
        { label: "Dashboard", href: "/principal" },
        { label: "Syllabus", href: "/principal/syllabus" },
        { label: "Schedule", href: "/principal/schedule" },
        { label: "Papers", href: "/principal/papers" },
        { label: "Students", href: "/principal/students" },
        { label: "Class Teachers", href: "/principal/classes" },
        { label: "Results", href: "/principal/results" },
        { label: "Performance", href: "/principal/performance" },
        { label: "Alerts", href: "/principal/alerts" },
        { label: "Messages", href: "/principal/messages" },
        { label: "Reports", href: "/principal/reports" }
      ]}
      bottomNavItems={[
        { label: "Home", href: "/principal", icon: "home" },
        { label: "Exams", href: "/principal/schedule", icon: "book-open" },
        { label: "Alerts", href: "/principal/alerts", icon: "bell" },
        { label: "Messages", href: "/principal/messages", icon: "message-circle" },
        { label: "Profile", href: "/principal", icon: "user" }
      ]}
    >
      {children}
    </RoleShell>
  );
}
