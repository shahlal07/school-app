import { requireAnyRole } from "@/lib/auth/session";
import { RoleShell } from "@/components/shared/role-shell";
import { getT } from "@/lib/i18n/get-translator";

export default async function PrincipalLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAnyRole(["owner", "principal"]);
  const t = await getT();

  return (
    <RoleShell
      userName={profile.full_name}
      brandLabel="Principal"
      homeHref="/principal"
      sidebarItems={[
        { label: t("nav.dashboard"), href: "/principal" },
        { label: t("nav.attendance"), href: "/principal/attendance" },
        { label: t("nav.syllabus"), href: "/principal/syllabus" },
        { label: t("nav.schedule"), href: "/principal/schedule" },
        { label: t("nav.papers"), href: "/principal/papers" },
        { label: t("nav.students"), href: "/principal/students" },
        { label: t("nav.classTeachers"), href: "/principal/classes" },
        { label: t("nav.results"), href: "/principal/results" },
        { label: t("nav.performance"), href: "/principal/performance" },
        { label: t("nav.alerts"), href: "/principal/alerts" },
        { label: t("nav.messages"), href: "/principal/messages" },
        { label: t("nav.reports"), href: "/principal/reports" }
      ]}
      bottomNavItems={[
        { label: t("nav.home"), href: "/principal", icon: "home" },
        { label: t("nav.attendance"), href: "/principal/attendance", icon: "user" },
        { label: t("nav.exams"), href: "/principal/schedule", icon: "book-open" },
        { label: t("nav.alerts"), href: "/principal/alerts", icon: "bell" },
        { label: t("nav.messages"), href: "/principal/messages", icon: "message-circle" }
      ]}
    >
      {children}
    </RoleShell>
  );
}
