import Link from "next/link";
import { ClassAttendanceForm } from "@/components/attendance/class-attendance-form";
import { Bdi } from "@/components/shared/bdi";
import type { AttendanceStatus } from "@/types/attendance";

export interface AttendanceClassOption {
  classId: string;
  sectionId: string;
  className: string;
  sectionName: string;
  studentCount: number;
  teacherName?: string;
}

interface Props {
  options: AttendanceClassOption[];
  selected?: {
    classId: string;
    sectionId: string;
    className: string;
    sectionName: string;
    students: { id: string; roll_no: string; name: string }[];
    existing: Record<string, AttendanceStatus>;
    submitted: boolean;
  } | null;
  attendanceDate: string;
  baseHref: string;
  heading?: string;
  description?: string;
}

export function StudentAttendanceWorkspace({ options, selected, attendanceDate, baseHref, heading = "Student Attendance", description = "Select a class and section to record the daily student register." }: Props) {
  return (
    <section className="mt-6 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-600">Daily register</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-neutral-900">{heading}</h2>
        <p className="mt-1 text-sm text-neutral-500">{description} · <Bdi>{attendanceDate}</Bdi></p>
      </div>

      {options.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
          <h3 className="text-base font-semibold text-neutral-900">No classes available</h3>
          <p className="mt-1 text-sm text-neutral-500">There are no active class/section rosters available for attendance.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {options.map((item) => {
            const active = selected?.classId === item.classId && selected.sectionId === item.sectionId;
            return (
              <Link key={`${item.classId}:${item.sectionId}`} href={`${baseHref}?class_id=${encodeURIComponent(item.classId)}&section_id=${encodeURIComponent(item.sectionId)}`} className={`rounded-2xl border p-4 transition ${active ? "border-primary-300 bg-primary-50 shadow-sm" : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900"><Bdi>{item.className}</Bdi> · <Bdi>{item.sectionName}</Bdi></p>
                    {item.teacherName && <p className="mt-1 truncate text-xs text-neutral-500">Class teacher: <Bdi>{item.teacherName}</Bdi></p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600"><Bdi>{item.studentCount}</Bdi> students</span>
                </div>
                <p className="mt-3 text-xs font-semibold text-primary-700">{active ? "Selected · open register" : "Open attendance register →"}</p>
              </Link>
            );
          })}
        </div>
      )}

      {selected && (
        <ClassAttendanceForm
          students={selected.students}
          classId={selected.classId}
          sectionId={selected.sectionId}
          attendanceDate={attendanceDate}
          existing={selected.existing}
          submitted={selected.submitted}
        />
      )}
    </section>
  );
}
