"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BottomNav, type BottomNavIcon } from "@/components/shared/bottom-nav";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { useTranslation } from "@/lib/i18n/locale-provider";
import { signOut } from "@/lib/auth-actions";

export interface SidebarNavItem {
  label: string;
  href: string;
}

export interface BottomNavItemConfig {
  label: string;
  href: string;
  icon: BottomNavIcon;
}

function isActivePath(pathname: string, href: string, homeHref: string): boolean {
  if (href === homeHref) {
    return pathname === homeHref;
  }
  return pathname.startsWith(href);
}

interface RoleShellProps {
  children: React.ReactNode;
  userName: string;
  brandLabel: string;
  homeHref: string;
  sidebarItems: SidebarNavItem[];
  bottomNavItems: BottomNavItemConfig[];
}

/**
 * Generic version of OwnerShell, parameterized by role so Principal/Academic
 * Coordinator/Clerk each get the same sidebar+bottom-nav chrome without a
 * copy-pasted shell per role. sidebarItems/bottomNavItems labels are built
 * by the calling layout.tsx (a server component) via lib/i18n/get-translator's
 * getT(), so this component itself only needs to translate its own fixed
 * chrome text (sign out) and render the app-wide language toggle.
 */
export function RoleShell({
  children,
  userName,
  brandLabel,
  homeHref,
  sidebarItems,
  bottomNavItems
}: RoleShellProps) {
  const pathname = usePathname();
  const { t, dir } = useTranslation();

  const asideSide = dir === "rtl" ? "right-0" : "left-0";
  const contentPadding = dir === "rtl" ? "md:pr-60" : "md:pl-60";

  return (
    <div className="min-h-screen bg-neutral-50">
      <aside
        className={`fixed inset-y-0 ${asideSide} hidden w-60 flex-col border-neutral-200 bg-white md:flex ${
          dir === "rtl" ? "border-l" : "border-r"
        }`}
      >
        <div className="flex h-16 items-center border-b border-neutral-200 px-5">
          <span className="text-lg font-bold text-primary-600">School OS</span>
          <span className="ml-2 truncate text-xs font-medium text-neutral-400">{brandLabel}</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label={`${brandLabel} navigation`}>
          <ul className="flex flex-col gap-1">
            {sidebarItems.map((item) => {
              const active = isActivePath(pathname, item.href, homeHref);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary-50 text-primary-700"
                        : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className={`flex min-h-screen flex-col ${contentPadding}`}>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Avatar name={userName} size="sm" />
            <span className="text-sm font-medium text-neutral-900">{userName}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                {t("common.signOut")}
              </Button>
            </form>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 pb-24 md:px-6 md:pb-6">{children}</main>
      </div>

      <div className="md:hidden">
        <BottomNav
          items={bottomNavItems.map((item) => ({
            label: item.label,
            href: item.href,
            icon: item.icon,
            active: isActivePath(pathname, item.href, homeHref)
          }))}
        />
      </div>
    </div>
  );
}
