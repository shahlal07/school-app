"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BottomNav, type BottomNavIcon } from "@/components/shared/bottom-nav";
import { signOut } from "@/lib/auth-actions";

interface SidebarNavItem {
  label: string;
  href: string;
}

const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  { label: "Dashboard", href: "/owner" },
  { label: "Examinations", href: "/owner/examinations" },
  { label: "Syllabus", href: "/owner/syllabus" },
  { label: "Teachers", href: "/owner/teachers" },
  { label: "Students", href: "/owner/students" },
  { label: "Results", href: "/owner/results" },
  { label: "Performance", href: "/owner/performance" },
  { label: "Alerts", href: "/owner/alerts" },
  { label: "Messages", href: "/owner/messages" },
  { label: "Reports", href: "/owner/reports" },
  { label: "Departments", href: "/owner/departments" },
  { label: "Settings", href: "/owner/settings" },
  { label: "Audit Log", href: "/owner/audit" }
];

interface BottomNavItemConfig {
  label: string;
  href: string;
  icon: BottomNavIcon;
}

const BOTTOM_NAV_ITEMS: BottomNavItemConfig[] = [
  { label: "Home", href: "/owner", icon: "home" },
  { label: "Exams", href: "/owner/examinations", icon: "book-open" },
  { label: "Alerts", href: "/owner/alerts", icon: "bell" },
  { label: "Messages", href: "/owner/messages", icon: "message-circle" },
  { label: "Profile", href: "/owner/settings", icon: "user" }
];

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

export function OwnerShell({ children, ownerName }: OwnerShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-neutral-50">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-neutral-200 bg-white md:flex">
        <div className="flex h-16 items-center border-b border-neutral-200 px-5">
          <span className="text-lg font-bold text-primary-600">School OS</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Owner navigation">
          <ul className="flex flex-col gap-1">
            {SIDEBAR_NAV_ITEMS.map((item) => {
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

      <div className="flex min-h-screen flex-col md:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Avatar name={ownerName} size="sm" />
            <span className="text-sm font-medium text-neutral-900">{ownerName}</span>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </header>

        <main className="flex-1 px-4 py-6 pb-24 md:px-6 md:pb-6">{children}</main>
      </div>

      <div className="md:hidden">
        <BottomNav
          items={BOTTOM_NAV_ITEMS.map((item) => ({
            label: item.label,
            href: item.href,
            icon: item.icon,
            active: isActivePath(pathname, item.href)
          }))}
        />
      </div>
    </div>
  );
}
