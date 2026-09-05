"use client";

import React from "react";
import { usePathname } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { BottomNav } from "@/components/shared/bottom-nav";
import { signOut } from "@/lib/auth-actions";

interface TeacherShellProps {
  children: React.ReactNode;
  teacherName: string;
}

export function TeacherShell({ children, teacherName }: TeacherShellProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", href: "/teacher", icon: "home" as const },
    { label: "Exams", href: "/teacher/exams", icon: "book-open" as const },
    { label: "Alerts", href: "/teacher/alerts", icon: "bell" as const },
    { label: "Messages", href: "/teacher/messages", icon: "message-circle" as const },
    { label: "Profile", href: "/teacher/profile", icon: "user" as const }
  ].map((item) => ({
    ...item,
    active: item.href === "/teacher" ? pathname === item.href : pathname.startsWith(item.href)
  }));

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-md">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4">
          <span className="text-base font-semibold text-neutral-900">School OS</span>
          <div className="flex items-center gap-2">
            <Avatar name={teacherName} size="sm" />
            <form action={signOut}>
              <button
                type="submit"
                aria-label="Sign out"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </form>
          </div>
        </header>

        <main className="px-4 pb-24 pt-4">{children}</main>
      </div>

      <BottomNav items={navItems} />
    </div>
  );
}
