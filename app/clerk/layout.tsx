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
      { label: t("nav.examPrinting"), href: "/clerk/papers" }
    ]}
    bottomNavItems={[
      { label: t("nav.home"), href: "/clerk", icon: "home" },
      { label: t("nav.printing"), href: "/clerk/papers", icon: "book-open" },
      { label: t("nav.students"), href: "/clerk/students", icon: "user" }
    ]}
  >{children}</RoleShell>;
}
