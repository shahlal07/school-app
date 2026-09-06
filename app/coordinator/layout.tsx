import { requireAnyRole } from "@/lib/auth/session";
import { RoleShell } from "@/components/shared/role-shell";

/**
 * Academic Coordinator segment guard. Allows "owner" in addition to
 * "academic_coordinator" so the owner can preview this dashboard
 * non-destructively (mirrors app/principal/layout.tsx's rationale).
 *
 * Sidebar/bottom-nav items point at /coordinator/* routes, NOT /owner/*.
 * app/owner/layout.tsx guards its whole subtree with requireRole("owner")
 * (strict, not requireAnyRole), so a coordinator hitting /owner/schedule or
 * /owner/papers directly would be bounced back to /coordinator before ever
 * reaching the page. Rather than loosen that owner-only guard (which would
 * also let a coordinator see OwnerShell's Teachers/Settings/Departments/
 * Audit Log links they have no access to - a UX leak even though those
 * pages/actions still self-gate), this segment has its own parallel
 * read/write pages under /coordinator/* that reuse the same components and
 * server actions as their /owner/* counterparts. This matches the pattern
 * already established by app/principal/* for the same problem.
 */
export default async function CoordinatorLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAnyRole(["owner", "academic_coordinator"]);

  return (
    <RoleShell
      userName={profile.full_name}
      brandLabel="Academic Coordinator"
      homeHref="/coordinator"
      sidebarItems={[
        { label: "Dashboard", href: "/coordinator" },
        { label: "Schedule", href: "/coordinator/schedule" },
        { label: "Calendar", href: "/coordinator/calendar" },
        { label: "Papers", href: "/coordinator/papers" },
        { label: "Performance", href: "/coordinator/performance" },
        { label: "Alerts", href: "/coordinator/alerts" },
        { label: "Messages", href: "/coordinator/messages" }
      ]}
      bottomNavItems={[
        { label: "Home", href: "/coordinator", icon: "home" },
        { label: "Schedule", href: "/coordinator/schedule", icon: "book-open" },
        { label: "Alerts", href: "/coordinator/alerts", icon: "bell" },
        { label: "Messages", href: "/coordinator/messages", icon: "message-circle" }
      ]}
    >
      {children}
    </RoleShell>
  );
}
