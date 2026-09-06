"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BottomNav, type BottomNavIcon } from "@/components/shared/bottom-nav";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { useTranslation } from "@/lib/i18n/locale-provider";
import { signOut } from "@/lib/auth-actions";

interface SidebarNavItem {
  label: string;
  href: string;
}

interface BottomNavItemConfig {
  label: string;
  href: string;
  icon: BottomNavIcon;
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/owner") {
    return pathname === "/owner";
  }
  return pathname.startsWith(href);
}

interface OwnerShellProps {
  children: React.ReactNode;
  ownerName: string;
}

function OwnerMobileNav({
  pathname,
  sidebarItems,
  bottomNavItems
}: {
  pathname: string;
  sidebarItems: SidebarNavItem[];
  bottomNavItems: BottomNavItemConfig[];
}) {
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <div className="md:hidden">
        <BottomNav
          items={bottomNavItems.map((item) => ({
            label: item.label,
            href: item.href,
            icon: item.icon,
            active: item.href === "#owner-more" ? moreOpen : isActivePath(pathname, item.href)
          }))}
          onItemClick={(href) => {
            if (href === "#owner-more") {
              setMoreOpen((open) => !open);
            }
          }}
        />
      </div>

      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label={t("common.close")}
            className="absolute inset-0 bg-black/20"
            onClick={() => setMoreOpen(false)}
          />
          <section
            aria-label="Owner menu"
            className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-neutral-200 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-4 shadow-2xl"
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-neutral-200" />
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-900">{t("nav.dashboard")}</h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100"
              >
                {t("common.close")}
              </button>
            </div>
            <nav aria-label="Owner mobile navigation">
              <ul className="grid grid-cols-2 gap-2">
                {sidebarItems.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`block rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                          active
                            ? "border-primary-200 bg-primary-50 text-primary-700"
                            : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </section>
        </div>
      )}
    </>
  );
}

export function OwnerShell({ children, ownerName }: OwnerShellProps) {
  const pathname = usePathname();
  const { t, dir } = useTranslation();

  const sidebarItems: SidebarNavItem[] = [
    { label: t("nav.dashboard"), href: "/owner" },
    { label: t("nav.attendance"), href: "/owner/attendance" },
    { label: t("nav.syllabus"), href: "/owner/syllabus" },
    { label: t("nav.schedule"), href: "/owner/schedule" },
    { label: t("nav.papers"), href: "/owner/papers" },
    { label: t("nav.teachers"), href: "/owner/teachers" },
    { label: t("nav.students"), href: "/owner/students" },
    { label: t("nav.classTeachers"), href: "/owner/classes" },
    { label: t("nav.results"), href: "/owner/results" },
    { label: t("nav.performance"), href: "/owner/performance" },
    { label: t("nav.alerts"), href: "/owner/alerts" },
    { label: t("nav.messages"), href: "/owner/messages" },
    { label: t("nav.reports"), href: "/owner/reports" },
    { label: t("nav.departments"), href: "/owner/departments" },
    { label: t("nav.settings"), href: "/owner/settings" },
    { label: t("nav.audit"), href: "/owner/audit" }
  ];

  const bottomNavItems: BottomNavItemConfig[] = [
    { label: t("nav.home"), href: "/owner", icon: "home" },
    { label: t("nav.attendance"), href: "/owner/attendance", icon: "user" },
    { label: t("nav.alerts"), href: "/owner/alerts", icon: "bell" },
    { label: t("nav.messages"), href: "/owner/messages", icon: "message-circle" },
    { label: t("common.view"), href: "#owner-more", icon: "menu" }
  ];

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
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Owner navigation">
          <ul className="flex flex-col gap-1">
            {sidebarItems.map((item) => {
              const active = isActivePath(pathname, item.href);
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
            <Avatar name={ownerName} size="sm" />
            <span className="text-sm font-medium text-neutral-900">{ownerName}</span>
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

      <OwnerMobileNav pathname={pathname} sidebarItems={sidebarItems} bottomNavItems={bottomNavItems} />
    </div>
  );
}
