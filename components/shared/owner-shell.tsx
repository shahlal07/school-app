"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { useTranslation } from "@/lib/i18n/locale-provider";
import { signOut } from "@/lib/auth-actions";

interface SidebarNavItem { label: string; href: string; icon: string; }

function isActivePath(pathname: string, href: string): boolean {
  return href === "/owner" ? pathname === "/owner" : pathname.startsWith(href);
}

const iconPaths: Record<string, React.ReactNode> = {
  home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/></>,
  chart: <><path d="M4 19V5"/><path d="M4 19h17"/><path d="m7 15 4-4 3 2 5-6"/></>,
  calendar: <><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
  exam: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  staff: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  report: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></>,
  message: <><path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.5 9.5 0 0 1-4-.9L3 21l1.9-4A8.5 8.5 0 1 1 21 11.5Z"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.1h-2.5V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.6-1H6v-2.5h.4A1.7 1.7 0 0 0 8 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.1h2.5V5a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v2.5H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  close: <><path d="m6 6 12 12M18 6 6 18"/></>
};

function Icon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>{iconPaths[name] ?? iconPaths.chart}</svg>;
}

export function OwnerShell({ children, ownerName }: { children: React.ReactNode; ownerName: string }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  const sidebarItems: SidebarNavItem[] = [
    { label: "Overview", href: "/owner", icon: "home" },
    { label: "Academic", href: "/owner/academic-health", icon: "chart" },
    { label: "Attendance", href: "/owner/attendance", icon: "calendar" },
    { label: "Examinations", href: "/owner/schedule", icon: "exam" },
    { label: "Students", href: "/owner/students", icon: "users" },
    { label: "Staff", href: "/owner/teachers", icon: "staff" },
    { label: "Reports", href: "/owner/reports", icon: "report" },
    { label: "Messages", href: "/owner/messages", icon: "message" },
    { label: "Notifications", href: "/owner/alerts", icon: "bell" },
    { label: "Settings", href: "/owner/settings", icon: "settings" }
  ];

  return (
    <div className="min-h-screen bg-[#f6f8fa] text-neutral-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col border-r border-neutral-200/80 bg-white md:flex">
        <div className="flex h-[72px] items-center gap-3 border-b border-neutral-100 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white">S</div>
          <div><p className="text-[15px] font-bold tracking-tight">School OS</p><p className="text-[10px] font-medium uppercase tracking-[.16em] text-neutral-400">Owner portal</p></div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Owner navigation">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-neutral-400">Workspace</p>
          <ul className="space-y-1">
            {sidebarItems.map((item) => { const active = isActivePath(pathname, item.href); return <li key={item.href}><Link href={item.href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${active ? "bg-primary-50 text-primary-700" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950"}`} aria-current={active ? "page" : undefined}><Icon name={item.icon} className="h-[17px] w-[17px]"/>{item.label}</Link></li>; })}
          </ul>
        </nav>
        <div className="border-t border-neutral-100 p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-neutral-50 p-3"><Avatar name={ownerName} size="sm"/><div className="min-w-0"><p className="truncate text-xs font-semibold">{ownerName}</p><p className="text-[10px] text-neutral-400">Owner</p></div></div>
        </div>
      </aside>

      <div className="min-h-screen md:pl-[252px]">
        <header className="sticky top-0 z-40 flex h-[64px] items-center justify-between border-b border-neutral-200/80 bg-white/95 px-4 backdrop-blur md:h-[72px] md:px-7">
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 shadow-sm md:hidden"><Icon name="menu" className="h-5 w-5"/></button>
            <div className="md:hidden"><p className="text-sm font-bold tracking-tight">School OS</p><p className="text-[9px] font-semibold uppercase tracking-[.14em] text-primary-600">Owner</p></div>
            <div className="hidden md:block"><p className="text-sm font-semibold text-neutral-900">Owner workspace</p><p className="text-[11px] text-neutral-400">Executive overview</p></div>
          </div>
          <div className="flex items-center gap-2"><LanguageToggle/><div className="hidden h-8 w-px bg-neutral-200 sm:block"/><Avatar name={ownerName} size="sm"/><form action={signOut} className="hidden sm:block"><Button type="submit" variant="ghost" size="sm">{t("common.signOut")}</Button></form></div>
        </header>

        <main className="px-4 py-5 pb-10 sm:px-6 md:px-7 md:py-7">{children}</main>
      </div>

      {menuOpen && <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="Owner navigation">
        <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-neutral-950/30 backdrop-blur-[1px]" onClick={() => setMenuOpen(false)}/>
        <aside className="absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col bg-white shadow-2xl">
          <div className="flex h-[72px] items-center justify-between border-b border-neutral-100 px-5"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white">S</div><div><p className="text-[15px] font-bold">School OS</p><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-primary-600">Owner portal</p></div></div><button type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100"><Icon name="close"/></button></div>
          <nav className="flex-1 overflow-y-auto px-4 py-5"><p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-neutral-400">Workspace</p><ul className="space-y-1">{sidebarItems.map((item) => { const active = isActivePath(pathname, item.href); return <li key={item.href}><Link href={item.href} onClick={() => setMenuOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${active ? "bg-primary-50 text-primary-700" : "text-neutral-700 hover:bg-neutral-50"}`}><Icon name={item.icon}/>{item.label}{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-600"/>}</Link></li>; })}</ul></nav>
          <div className="border-t border-neutral-100 p-4"><div className="flex items-center gap-3 rounded-2xl bg-neutral-50 p-3"><Avatar name={ownerName} size="sm"/><div className="min-w-0"><p className="truncate text-xs font-semibold">{ownerName}</p><p className="text-[10px] text-neutral-400">Owner</p></div><form action={signOut} className="ml-auto"><button type="submit" className="text-xs font-semibold text-neutral-500">Sign out</button></form></div></div>
        </aside>
      </div>}
    </div>
  );
}
