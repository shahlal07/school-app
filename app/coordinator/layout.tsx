import { requireAnyRole } from "@/lib/auth/session";
import { RoleShell } from "@/components/shared/role-shell";
import { getT } from "@/lib/i18n/get-translator";

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
  const t = await getT();

  return (
    <RoleShell
      userName={profile.full_name}
      brandLabel="Academic Coordinator"
      homeHref="/coordinator"
      sidebarItems={[
        { label: t("nav.dashboard"), href: "/coordinator" },
        { label: t("nav.attendance"), href: "/coordinator/attendance" },
        { label: t("nav.schedule"), href: "/coordinator/schedule" },
        { label: t("nav.syllabus"), href: "/coordinator/syllabus" },
        { label: t("nav.calendar"), href: "/coordinator/calendar" },
        { label: t("nav.examSets"), href: "/coordinator/exam-sets" },
        { label: t("nav.papers"), href: "/coordinator/papers" },
        { label: t("nav.performance"), href: "/coordinator/performance" },
        { label: t("nav.alerts"), href: "/coordinator/alerts" },
        { label: t("nav.messages"), href: "/coordinator/messages" }
      ]}
      bottomNavItems={[
        { label: t("nav.home"), href: "/coordinator", icon: "home" },
        { label: t("nav.attendance"), href: "/coordinator/attendance", icon: "user" },
        { label: t("nav.schedule"), href: "/coordinator/schedule", icon: "book-open" },
        { label: t("nav.alerts"), href: "/coordinator/alerts", icon: "bell" },
        { label: t("nav.messages"), href: "/coordinator/messages", icon: "message-circle" }
      ]}
    >
      {children}
    </RoleShell>
  );
}
