"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BottomNav, type BottomNavIcon } from "@/components/shared/bottom-nav";
import { signOut } from "@/lib/auth-actions";

interface SidebarNavItem { label: string; href: string; }

const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  { label: "Dashboard", href: "/owner" },
  { label: "Attendance", href: "/owner/attendance" },
  { label: "Syllabus", href: "/owner/syllabus" },
  { label: "Schedule", href: "/owner/schedule" },
  { label: "Papers", href: "/owner/papers" },
  { label: "Teachers", href: "/owner/teachers" },
  { label: "Students", href: "/owner/students" },
  { label: "Class Teachers", href: "/owner/classes" },
  { label: "Results", href: "/owner/results" },
  { label: "Performance", href: "/owner/performance" },
  { label: "Alerts", href: "/owner/alerts" },
  { label: "Messages", href: "/owner/messages" },
  { label: "Reports", href: "/owner/reports" },
  { label: "Departments", href: "/owner/departments" },
  { label: "Settings", href: "/owner/settings" },
  { label: "Audit Log", href: "/owner/audit" }
];

interface BottomNavItemConfig { label: string; href: string; icon: BottomNavIcon; }
const BOTTOM_NAV_ITEMS: BottomNavItemConfig[] = [
  { label: "Home", href: "/owner", icon: "home" },
  { label: "Attendance", href: "/owner/attendance", icon: "user" },
  { label: "Alerts", href: "/owner/alerts", icon: "bell" },
  { label: "Messages", href: "/owner/messages", icon: "message-circle" },
  { label: "More", href: "#owner-more", icon: "menu" }
];

function isActivePath(pathname: string, href: string) { return href === "/owner" ? pathname === href : pathname.startsWith(href); }

interface OwnerShellProps { children: React.ReactNode; ownerName: string; }

function OwnerMobileNav({ pathname }: { pathname: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  return (
    <>
      <div className="md:hidden"><BottomNav items={BOTTOM_NAV_ITEMS.map((item) => ({ ...item, active: item.href === "#owner-more" ? moreOpen : isActivePath(pathname, item.href) }))} onItemClick={(href) => { if (href === "#owner-more") setMoreOpen((open) => !open); }} /></div>
      {moreOpen && <div className="fixed inset-0 z-50 md:hidden">
        <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/20" onClick={() => setMoreOpen(false)} />
        <section aria-label="Owner menu" className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-neutral-200 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-4 shadow-2xl">
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-neutral-200" />
          <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold text-neutral-900">All owner functions</h2><button type="button" onClick={() => setMoreOpen(false)} className="rounded-lg px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100">Close</button></div>
          <nav aria-label="Owner mobile navigation"><ul className="grid grid-cols-2 gap-2">{SIDEBAR_NAV_ITEMS.map((item) => <li key={item.href}><Link href={item.href} onClick={() => setMoreOpen(false)} aria-current={isActivePath(pathname, item.href) ? "page" : undefined} className={`block rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${isActivePath(pathname, item.href) ? "border-primary-200 bg-primary-50 text-primary-700" : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"}`}>{item.label}</Link></li>)}</ul></nav>
        </section>
      </div>}
    </>
  );
}

export function OwnerShell({ children, ownerName }: OwnerShellProps) {
  const pathname = usePathname();
  return <div className="min-h-screen bg-neutral-50">
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-neutral-200 bg-white md:flex"><div className="flex h-16 items-center border-b border-neutral-200 px-5"><span className="text-lg font-bold text-primary-600">School OS</span></div><nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Owner navigation"><ul className="flex flex-col gap-1">{SIDEBAR_NAV_ITEMS.map((item) => <li key={item.href}><Link href={item.href} className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActivePath(pathname, item.href) ? "bg-primary-50 text-primary-700" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"}`} aria-current={isActivePath(pathname, item.href) ? "page" : undefined}>{item.label}</Link></li>)}</ul></nav></aside>
    <div className="flex min-h-screen flex-col md:pl-60"><header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 md:px-6"><div className="flex items-center gap-3"><Avatar name={ownerName} size="sm" /><span className="text-sm font-medium text-neutral-900">{ownerName}</span></div><form action={signOut}><Button type="submit" variant="ghost" size="sm">Sign out</Button></form></header><main className="flex-1 px-4 py-6 pb-24 md:px-6 md:pb-6">{children}</main></div>
    <OwnerMobileNav pathname={pathname} />
  </div>;
}
