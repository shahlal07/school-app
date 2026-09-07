"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/types/database";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { updateStaffProfile } from "./profile-actions";

const roleLabel: Record<string, string> = { teacher: "Teacher", principal: "Principal", academic_coordinator: "Academic Coordinator", clerk: "Clerk" };

function Editor({ profile, close, saved }: { profile: Profile | null; close: () => void; saved: () => void }) {
  const [name, setName] = useState(profile?.full_name ?? ""); const [phone, setPhone] = useState(profile?.phone ?? ""); const [username, setUsername] = useState(profile?.username ?? ""); const [designation, setDesignation] = useState(profile?.designation ?? ""); const [joining, setJoining] = useState(profile?.joining_date ?? ""); const [active, setActive] = useState(profile?.is_active ?? true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) { e.preventDefault(); if (!profile) return; setSaving(true); setError(null); const result = await updateStaffProfile(profile.id, { fullName: name, phone, username, designation, joiningDate: joining, isActive: active }); setSaving(false); if (result.error) { setError(result.error); return; } saved(); }
  return <Dialog open={!!profile} onClose={close} title={`Edit ${profile?.full_name ?? "staff"}`} description="Clerk-managed staff identity, contact and account record.">
    <form onSubmit={submit} className="space-y-4">
      {error && <p role="alert" className="text-sm text-danger-600">{error}</p>}
      <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
      <div className="grid gap-4 sm:grid-cols-2"><Input label="Contact number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /><Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="teacher.username" /></div>
      <div className="grid gap-4 sm:grid-cols-2"><Input label="Designation" value={designation} onChange={(e) => setDesignation(e.target.value)} /><Input label="Joining date" type="date" value={joining} onChange={(e) => setJoining(e.target.value)} /></div>
      <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active staff account</label>
      <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={close}>Cancel</Button><Button type="submit" loading={saving}>Save profile</Button></div>
    </form>
  </Dialog>;
}

function Directory({ profiles }: { profiles: Profile[] }) {
  const router = useRouter(); const { toast } = useToast(); const [editing, setEditing] = useState<Profile | null>(null);
  return <div>{profiles.length === 0 ? <EmptyState title="No staff profiles" description="Staff accounts will appear here once created." /> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{profiles.map((p) => <Card key={p.id}><CardHeader className="flex flex-row items-center gap-3"><Avatar name={p.full_name} size="md" /><div className="min-w-0 flex-1"><CardTitle className="truncate">{p.full_name}</CardTitle><p className="truncate text-xs text-neutral-500">{roleLabel[p.role] ?? p.role}</p></div></CardHeader><CardContent><dl className="space-y-1 text-sm"><div className="flex justify-between gap-3"><dt className="text-neutral-500">Username</dt><dd className="font-medium">{p.username ? `@${p.username}` : "—"}</dd></div><div className="flex justify-between gap-3"><dt className="text-neutral-500">Phone</dt><dd>{p.phone ?? "—"}</dd></div><div className="flex justify-between gap-3"><dt className="text-neutral-500">Designation</dt><dd>{p.designation ?? "—"}</dd></div></dl><div className="mt-3 flex items-center justify-between"><Badge variant={p.is_active ? "success" : "neutral"}>{p.is_active ? "Active" : "Inactive"}</Badge><Button variant="secondary" size="sm" onClick={() => setEditing(p)}>Edit profile</Button></div></CardContent></Card>)}</div>}<Editor profile={editing} close={() => setEditing(null)} saved={() => { setEditing(null); toast("Staff profile saved", "success"); router.refresh(); }} /></div>;
}

export function StaffDirectoryClient({ profiles }: { profiles: Profile[] }) { return <ToastProvider><Directory profiles={profiles} /></ToastProvider>; }
