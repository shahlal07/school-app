"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function updateStudentBase(studentId: string, input: { name: string; rollNo: string; classId: string; sectionId: string }) {
  await requireAnyRole(["owner", "principal", "clerk"]);
  const supabase = createClient();
  const name = input.name.trim();
  const rollNo = input.rollNo.trim();
  if (!name || !rollNo) return { error: "Name and roll number are required." };
  const { error } = await supabase.from("students").update({ name, roll_no: rollNo, class_id: input.classId, section_id: input.sectionId }).eq("id", studentId);
  if (error) return { error: error.code === "23505" ? "That roll number is already assigned." : error.message };
  revalidatePath(`/clerk/students/${studentId}`);
  revalidatePath("/clerk/students");
  return { error: null };
}

export async function saveStudentProfile(studentId: string, input: {
  fatherName: string; guardianName: string; guardianRelation: string; dateOfBirth: string;
  gender: string; nationality: string; address: string; city: string; contactNumber: string;
  guardianContactNumber: string; admissionDate: string; previousSchool: string; bloodGroup: string; notes: string;
}) {
  await requireAnyRole(["owner", "principal", "clerk"]);
  const supabase = createClient();
  const { error } = await supabase.rpc("clerk_upsert_student_profile", {
    p_student_id: studentId,
    p_father_name: input.fatherName,
    p_guardian_name: input.guardianName,
    p_guardian_relation: input.guardianRelation,
    p_date_of_birth: input.dateOfBirth || null,
    p_gender: input.gender,
    p_nationality: input.nationality,
    p_address: input.address,
    p_city: input.city,
    p_contact_number: input.contactNumber,
    p_guardian_contact_number: input.guardianContactNumber,
    p_admission_date: input.admissionDate || null,
    p_previous_school: input.previousSchool,
    p_blood_group: input.bloodGroup,
    p_notes: input.notes
  });
  if (error) return { error: error.message };
  revalidatePath(`/clerk/students/${studentId}`);
  return { error: null };
}
