import { requireAnyRole } from "@/lib/auth/session";
import { RoleShell } from "@/components/shared/role-shell";
import { getT } from "@/lib/i18n/get-translator";

export default async function ClerkLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAnyRole(["owner", "clerk"]);
  const t = await getT();
  return <RoleShell
    userName={profile.full_name}
    brandLabel="Clerk"
    homeHref="/clerk"
    sidebarItems={[
      { label: t("nav.dashboard"), href: "/clerk" },
      { label: t("nav.students"), href: "/clerk/students" },
      { label: t("nav.staff"), href: "/clerk/staff" },
      { label: "Documents", href: "/clerk/documents" },
      { label: "Admissions", href: "/clerk/admissions" },
      { label: "Fees", href: "/clerk/fees" },
      { label: t("nav.examPrinting"), href: "/clerk/papers" },
      { label: "Enter Marks", href: "/clerk/marks" },
      { label: "Attendance", href: "/clerk/attendance" }
    ]}
    bottomNavItems={[
      { label: t("nav.home"), href: "/clerk", icon: "home" },
      { label: "Marks", href: "/clerk/marks", icon: "book-open" },
      { label: "Attendance", href: "/clerk/attendance", icon: "user" }
    ]}
  >{children}</RoleShell>;
}
