import { requireAnyRole } from "@/lib/auth/session";
import { RoleShell } from "@/components/shared/role-shell";

export default async function ClerkLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAnyRole(["owner", "clerk"]);
  return <RoleShell
    userName={profile.full_name}
    brandLabel="Clerk"
    homeHref="/clerk"
    sidebarItems={[
      { label: "Dashboard", href: "/clerk" },
      { label: "Students", href: "/clerk/students" },
      { label: "Staff", href: "/clerk/staff" },
      { label: "Exam Printing", href: "/clerk/papers" }
    ]}
    bottomNavItems={[
      { label: "Home", href: "/clerk", icon: "home" },
      { label: "Printing", href: "/clerk/papers", icon: "book-open" },
      { label: "Students", href: "/clerk/students", icon: "user" }
    ]}
  >{children}</RoleShell>;
}
