import { requireAnyRole } from "@/lib/auth/session";
import { RoleShell } from "@/components/shared/role-shell";

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
        { label: "Attendance", href: "/principal/attendance" },
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
        { label: "Attendance", href: "/principal/attendance", icon: "user" },
        { label: "Exams", href: "/principal/schedule", icon: "book-open" },
        { label: "Alerts", href: "/principal/alerts", icon: "bell" },
        { label: "Messages", href: "/principal/messages", icon: "message-circle" }
      ]}
    >
      {children}
    </RoleShell>
  );
}
