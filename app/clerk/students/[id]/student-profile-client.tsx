"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast, ToastProvider } from "@/components/ui/toast";
import { saveStudentProfile, updateStudentBase } from "./actions";

export interface StudentProfileFormData {
  fatherName: string; guardianName: string; guardianRelation: string; dateOfBirth: string;
  gender: string; nationality: string; address: string; city: string; contactNumber: string;
  guardianContactNumber: string; admissionDate: string; previousSchool: string; bloodGroup: string; notes: string;
}

interface Props { student: { id: string; name: string; roll_no: string; class_id: string; section_id: string }; profile: StudentProfileFormData; classes: { id: string; name: string }[]; sections: { id: string; class_id: string; name: string }[]; }

function StudentProfileForm({ student, profile, classes, sections }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [base, setBase] = useState({ name: student.name, rollNo: student.roll_no, classId: student.class_id, sectionId: student.section_id });
  const [form, setForm] = useState(profile);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof StudentProfileFormData, value: string) => setForm((old) => ({ ...old, [key]: value }));
  const availableSections = sections.filter((s) => s.class_id === base.classId);

  async function submit(e: FormEvent) {
    e.preventDefault(); setSaving(true);
    const first = await updateStudentBase(student.id, base);
    if (first.error) { setSaving(false); toast(first.error, "danger"); return; }
    const second = await saveStudentProfile(student.id, form);
    setSaving(false);
    if (second.error) { toast(second.error, "danger"); return; }
    toast("Student profile saved", "success"); router.refresh();
  }

  return <form onSubmit={submit} className="space-y-5">
    <Card><CardHeader><CardTitle>Identity & enrollment</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
      <Input label="Student name" value={base.name} onChange={(e) => setBase({ ...base, name: e.target.value })} required />
      <Input label="Roll number" value={base.rollNo} onChange={(e) => setBase({ ...base, rollNo: e.target.value })} required />
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">Class<select className="h-11 rounded-xl border border-neutral-300 px-3 font-normal" value={base.classId} onChange={(e) => setBase({ ...base, classId: e.target.value, sectionId: "" })}>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">Section<select className="h-11 rounded-xl border border-neutral-300 px-3 font-normal" value={base.sectionId} onChange={(e) => setBase({ ...base, sectionId: e.target.value })}>{availableSections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    </CardContent></Card>

    <Card><CardHeader><CardTitle>Personal biodata</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
      <Input label="Father's name" value={form.fatherName} onChange={(e) => set("fatherName", e.target.value)} />
      <Input label="Guardian name" value={form.guardianName} onChange={(e) => set("guardianName", e.target.value)} />
      <Input label="Guardian relation" value={form.guardianRelation} onChange={(e) => set("guardianRelation", e.target.value)} placeholder="Father, mother, guardian..." />
      <Input label="Date of birth" type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
      <Input label="Gender" value={form.gender} onChange={(e) => set("gender", e.target.value)} placeholder="Male / Female / Other" />
      <Input label="Nationality" value={form.nationality} onChange={(e) => set("nationality", e.target.value)} />
      <Input label="Blood group" value={form.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)} placeholder="e.g. B+" />
      <Input label="City" value={form.city} onChange={(e) => set("city", e.target.value)} />
      <div className="sm:col-span-2"><Input label="Address" value={form.address} onChange={(e) => set("address", e.target.value)} /></div>
    </CardContent></Card>

    <Card><CardHeader><CardTitle>Contact & admission</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
      <Input label="Student contact number" type="tel" value={form.contactNumber} onChange={(e) => set("contactNumber", e.target.value)} />
      <Input label="Guardian contact number" type="tel" value={form.guardianContactNumber} onChange={(e) => set("guardianContactNumber", e.target.value)} />
      <Input label="Admission date" type="date" value={form.admissionDate} onChange={(e) => set("admissionDate", e.target.value)} />
      <Input label="Previous school" value={form.previousSchool} onChange={(e) => set("previousSchool", e.target.value)} />
      <div className="sm:col-span-2"><Input label="Notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
    </CardContent></Card>

    <div className="flex justify-end"><Button type="submit" loading={saving}>Save profile</Button></div>
  </form>;
}

export function StudentProfileClient(props: Props) { return <ToastProvider><StudentProfileForm {...props} /></ToastProvider>; }
