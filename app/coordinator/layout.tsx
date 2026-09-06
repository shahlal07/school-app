import { requireAnyRole } from "@/lib/auth/session";
import { RoleShell } from "@/components/shared/role-shell";

/**
 * Academic Coordinator segment guard. Allows "owner" in addition to
 * "academic_coordinator" so the owner can preview this dashboard
 * non-destructively.
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
        { label: "Attendance", href: "/coordinator/attendance" },
        { label: "Schedule", href: "/coordinator/schedule" },
        { label: "Syllabus", href: "/coordinator/syllabus" },
        { label: "Calendar", href: "/coordinator/calendar" },
        { label: "Exam Sets", href: "/coordinator/exam-sets" },
        { label: "Papers", href: "/coordinator/papers" },
        { label: "Performance", href: "/coordinator/performance" },
        { label: "Alerts", href: "/coordinator/alerts" },
        { label: "Messages", href: "/coordinator/messages" }
      ]}
      bottomNavItems={[
        { label: "Home", href: "/coordinator", icon: "home" },
        { label: "Attendance", href: "/coordinator/attendance", icon: "user" },
        { label: "Schedule", href: "/coordinator/schedule", icon: "book-open" },
        { label: "Alerts", href: "/coordinator/alerts", icon: "bell" },
        { label: "Messages", href: "/coordinator/messages", icon: "message-circle" }
      ]}
    >
      {children}
    </RoleShell>
  );
}
