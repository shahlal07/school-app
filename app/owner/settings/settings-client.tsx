"use client";

import { FormEvent, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n/locale-provider";

import { updatePassPercentage } from "./actions";

interface SettingsClientProps {
  initialPassPercentage: number;
  schoolStats: {
    activeStaff: number;
    teachers: number;
    classes: number;
    subjects: number;
  };
}

const sections = [
  {
    eyebrow: "School",
    title: "School profile",
    description: "Identity, contact details, academic session and school-wide defaults.",
    links: [
      ["School overview", "/owner"],
      ["Academic health", "/owner/academic-health"]
    ]
  },
  {
    eyebrow: "People",
    title: "Staff & roles",
    description: "Review the people who operate School OS and their current account status.",
    links: [["Staff command center", "/owner/teachers"]]
  },
  {
    eyebrow: "Communication",
    title: "Notifications & messaging",
    description: "Leadership signals, compliance alerts and staff communication live here.",
    links: [
      ["Notifications", "/owner/alerts"],
      ["Messages", "/owner/messages"]
    ]
  },
  {
    eyebrow: "Data",
    title: "Reports & records",
    description: "School-wide reporting and operational records without exposing raw database controls.",
    links: [
      ["Executive reports", "/owner/reports"],
      ["Student directory", "/owner/students"]
    ]
  }
] as const;

function SettingsInner({ initialPassPercentage, schoolStats }: SettingsClientProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [value, setValue] = useState(String(initialPassPercentage));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = Number(value);
    setError(null);
    setSaving(true);
    const result = await updatePassPercentage(parsed);
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    toast(t("owner.settings.updated"), "success");
  };

  return (
    <main className="min-h-full bg-neutral-50 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">
            Owner · Settings
          </p>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
                School OS control center
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                Configure school-wide rules, review authority and jump to the areas that control how the school operates.
              </p>
            </div>
            <Badge variant="success">Owner access</Badge>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Active staff" value={schoolStats.activeStaff} detail="Current staff accounts" />
          <Metric label="Teachers" value={schoolStats.teachers} detail="Active teaching staff" />
          <Metric label="Classes" value={schoolStats.classes} detail="Configured class groups" />
          <Metric label="Subjects" value={schoolStats.subjects} detail="Configured subjects" />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-600">Academic</p>
              <CardTitle className="mt-1">Academic configuration</CardTitle>
              <p className="mt-1 text-sm leading-6 text-neutral-500">
                Keep school-wide academic rules here. Routine academic operations remain with the Coordinator and teachers.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p role="alert" className="text-sm text-danger-600">{error}</p>}
                <div className="flex flex-col gap-3 rounded-xl bg-neutral-50 p-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">Pass percentage</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-500">Used as the school-wide passing threshold for results.</p>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="w-28">
                      <Input
                        label="Percent"
                        type="number"
                        inputMode="decimal"
                        min={1}
                        max={100}
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                      />
                    </div>
                    <span className="pb-2 text-sm font-medium text-neutral-500">%</span>
                  </div>
                </div>
                <Button type="submit" loading={saving}>{t("common.save")}</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-600">System</p>
              <CardTitle className="mt-1">System status</CardTitle>
              <p className="mt-1 text-sm leading-6 text-neutral-500">Core School OS areas available from this account.</p>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {[
                ["Database", "Connected"],
                ["Authentication", "Protected"],
                ["Attendance", "Active"],
                ["Examinations", "Active"],
                ["Messaging", "Active"],
                ["Notifications", "Active"]
              ].map(([name, status]) => (
                <div key={name} className="flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-3">
                  <span className="text-sm font-medium text-neutral-800">{name}</span>
                  <Badge variant="success">{status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {sections.map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-600">{section.eyebrow}</p>
                <CardTitle className="mt-1">{section.title}</CardTitle>
                <p className="mt-1 text-sm leading-6 text-neutral-500">{section.description}</p>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {section.links.map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    className="inline-flex min-h-10 items-center rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-800 transition hover:border-primary-300 hover:bg-primary-50"
                  >
                    {label} →
                  </a>
                ))}
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Security & accountability</p>
              <h2 className="mt-1 text-base font-semibold text-neutral-900">Protected system actions</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">
                Account security, audit history and destructive system controls should remain protected server-side. This page does not expose raw database credentials, permission bypasses or reset controls.
              </p>
            </div>
            <Badge variant="warning">Restricted</Badge>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{detail}</p>
    </div>
  );
}

export function SettingsClient(props: SettingsClientProps) {
  return (
    <ToastProvider>
      <SettingsInner {...props} />
    </ToastProvider>
  );
}
