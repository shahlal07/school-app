import Link from "next/link";
import type { ReactNode } from "react";

export type DashboardTone = "neutral" | "success" | "info" | "warning" | "danger";

export interface DashboardMetric { label: string; value: string | number; href?: string; tone?: DashboardTone; detail?: string; }
export interface DashboardItem { title: string; detail?: string; href?: string; tone?: DashboardTone; badge?: string; icon?: string; }
export interface DashboardQuickAction { label: string; href: string; icon?: string; primary?: boolean; }

const toneClasses: Record<DashboardTone, string> = {
  neutral: "bg-neutral-50 text-neutral-800 border-neutral-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-100",
  info: "bg-sky-50 text-sky-700 border-sky-100",
  warning: "bg-amber-50 text-amber-700 border-amber-100",
  danger: "bg-red-50 text-red-700 border-red-100"
};

function Icon({ name, className = "h-4 w-4" }: { name?: string; className?: string }) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/></>,
    chart: <><path d="M4 19V5"/><path d="M4 19h17"/><path d="m7 15 4-4 3 2 5-6"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
    alert: <><path d="m10.3 3.6-8 14A2 2 0 0 0 4 20.6h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></>,
    calendar: <><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
    printer: <><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    people: <><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2 20a6 6 0 0 1 12 0"/><path d="M10 20a6 6 0 0 1 12 0"/></>
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name ?? ""] ?? paths.chart}</svg>;
}

function MetricTile({ metric }: { metric: DashboardMetric }) {
  const tone = metric.tone ?? "neutral";
  const body = <div className={`rounded-2xl border p-3 ${toneClasses[tone]}`}><p className="text-[11px] font-medium opacity-80">{metric.label}</p><p className="mt-1 text-xl font-semibold tracking-tight">{metric.value}</p>{metric.detail && <p className="mt-0.5 text-[10px] opacity-70">{metric.detail}</p>}</div>;
  return metric.href ? <Link href={metric.href} className="block transition-transform active:scale-[.98]">{body}</Link> : body;
}

export function DashboardSection({ title, action, children }: { title: string; action?: { label: string; href: string }; children: ReactNode }) {
  return <section className="mt-4"><div className="mb-2 flex items-center justify-between gap-3 px-1"><h2 className="text-sm font-semibold text-neutral-900">{title}</h2>{action && <Link href={action.href} className="text-[11px] font-semibold text-primary-600">{action.label} →</Link>}</div>{children}</section>;
}

export function DashboardList({ items }: { items: DashboardItem[] }) {
  if (!items.length) return <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-5 text-center text-sm text-neutral-500">Nothing needs attention right now.</div>;
  return <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">{items.map((item, index) => { const tone=item.tone??"neutral"; const row=<div className={`flex items-start gap-3 px-4 py-3.5 ${index?"border-t border-neutral-100":""}`}><span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${toneClasses[tone]}`}><Icon name={item.icon}/></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="text-sm font-medium text-neutral-900">{item.title}</p>{item.badge&&<span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${toneClasses[tone]}`}>{item.badge}</span>}</div>{item.detail&&<p className="mt-0.5 text-xs leading-5 text-neutral-500">{item.detail}</p>}</div>{item.href&&<Icon name="arrow" className="mt-2 h-3.5 w-3.5 shrink-0 text-neutral-300"/>}</div>; return item.href?<Link href={item.href} key={`${item.title}-${index}`} className="block active:bg-neutral-50">{row}</Link>:<div key={`${item.title}-${index}`}>{row}</div>; })}</div>;
}

export function DashboardShell({ eyebrow, title, subtitle, metrics, children, quickActions, accent="primary" }: { eyebrow?: string; title: string; subtitle: string; metrics: DashboardMetric[]; children: ReactNode; quickActions?: DashboardQuickAction[]; accent?: "primary"|"violet"|"blue" }) {
  const accentClass=accent==="violet"?"bg-violet-600":accent==="blue"?"bg-blue-600":"bg-primary-600";
  return <main className="-mx-4 -mt-6 min-h-[calc(100vh-4rem)] bg-[#f8fafb] px-4 pb-24 pt-5 sm:-mx-6 sm:px-6"><div className="mx-auto w-full max-w-2xl"><div className="px-1">{eyebrow&&<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-600">{eyebrow}</p>}<h1 className="mt-1 text-[25px] font-semibold tracking-tight text-neutral-950">{title}</h1><p className="mt-1 text-sm leading-5 text-neutral-500">{subtitle}</p></div><div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">{metrics.map((metric)=><MetricTile key={metric.label} metric={metric}/>)}</div>{quickActions&&<div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">{quickActions.map((action)=><Link key={`${action.href}-${action.label}`} href={action.href} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${action.primary?`${accentClass} border-transparent text-white`:"border-neutral-200 bg-white text-neutral-700"}`}><Icon name={action.icon} className="h-3.5 w-3.5"/>{action.label}</Link>)}</div>}{children}</div></main>;
}

export function ProgressCard({ title, value, detail, href, tone="info" }: { title: string; value: number; detail: string; href?: string; tone?: DashboardTone }) {
  const card=<div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.03)]"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-neutral-900">{title}</p><p className="mt-1 text-xs text-neutral-500">{detail}</p></div><div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[5px] ${toneClasses[tone]}`}><span className="text-sm font-bold">{value}</span></div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-primary-500" style={{width:`${Math.max(0,Math.min(100,value))}%`}}/></div></div>;
  return href?<Link href={href} className="block">{card}</Link>:card;
}

export function TrendCard({ title, points, href }: { title:string; points:number[]; href?:string }) {
  const max=Math.max(...points,1); const min=Math.min(...points,0); const range=Math.max(max-min,1); const coords=points.map((p,i)=>`${(i/Math.max(points.length-1,1))*100},${100-((p-min)/range)*82-9}`).join(" ");
  const card=<div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.03)]"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-neutral-900">{title}</p><span className="text-[11px] font-medium text-primary-600">Last {points.length}</span></div><div className="mt-3 h-28 w-full"><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible"><path d="M 0 88 H 100 M 0 50 H 100 M 0 12 H 100" stroke="#eef2f4" strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke"/><polyline points={coords} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500" vectorEffect="non-scaling-stroke"/></svg></div></div>;
  return href?<Link href={href} className="block">{card}</Link>:card;
}

export function MiniTable({ headers, rows, href }: { headers:string[]; rows:ReactNode[][]; href?:string }) {
  const table=<div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[420px] text-left text-xs"><thead><tr className="border-b border-neutral-100 bg-neutral-50/70">{headers.map((h)=><th key={h} className="px-3 py-2.5 font-semibold text-neutral-500">{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i} className="border-b border-neutral-100 last:border-0">{row.map((cell,j)=><td key={j} className={`px-3 py-3 ${j===0?"font-medium text-neutral-900":"text-neutral-600"}`}>{cell}</td>)}</tr>)}</tbody></table></div></div>;
  return href?<Link href={href} className="block">{table}</Link>:table;
}

export { Icon };
