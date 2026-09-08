import type { Profile, StaffRole } from "@/types/database";
import type { Class } from "@/types/examination";

interface Assignment {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string;
}

interface OwnerStaffOverviewProps {
  staff: Profile[];
  classes: Class[];
  assignments: Assignment[];
}

const roleLabels: Record<StaffRole, string> = {
  owner: "Owner",
  principal: "Principal",
  academic_coordinator: "Academic Coordinator",
  clerk: "Clerk",
  teacher: "Teacher"
};

export function OwnerStaffOverview({ staff, classes, assignments }: OwnerStaffOverviewProps) {
  const active = staff.filter((person) => person.is_active);
  const teachers = active.filter((person) => person.role === "teacher");
  const inactive = staff.length - active.length;
  const assignedTeacherIds = new Set(assignments.map((assignment) => assignment.teacher_id));
  const uncoveredTeachers = teachers.filter((teacher) => !assignedTeacherIds.has(teacher.user_id));
  const populatedClasses = new Set(assignments.map((assignment) => assignment.class_id));
  const coverageRate = classes.length ? Math.round((populatedClasses.size / classes.length) * 100) : 0;
  const roleCounts = (Object.keys(roleLabels) as StaffRole[])
    .filter((role) => role !== "owner")
    .map((role) => ({ role, count: active.filter((person) => person.role === role).length }));
  const assignmentCounts = teachers.map((teacher) => ({
    teacher,
    count: assignments.filter((assignment) => assignment.teacher_id === teacher.user_id).length
  }));
  const topAssigned = assignmentCounts.slice().sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">Owner · Staff</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">Staff command center</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">Executive visibility into staffing, teaching coverage and workload signals. Routine staff records and account administration stay with the Clerk.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Active staff" value={active.length} detail="Current active profiles" />
        <Metric label="Teachers" value={teachers.length} detail="Active teaching staff" />
        <Metric label="Teaching assignments" value={assignments.length} detail="Teacher-subject-class links" />
        <Metric label="Class coverage" value={`${coverageRate}%`} detail={`${populatedClasses.size} of ${classes.length} classes covered`} />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="font-semibold text-neutral-950">Staff composition</h2><p className="mt-1 text-sm text-neutral-500">Active staff by role.</p></div>
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">{inactive} inactive</span>
          </div>
          <div className="mt-5 space-y-3">
            {roleCounts.map(({ role, count }) => <div key={role} className="flex items-center justify-between gap-4"><span className="text-sm text-neutral-700">{roleLabels[role]}</span><span className="text-sm font-semibold text-neutral-950">{count}</span></div>)}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-semibold text-neutral-950">Coverage signal</h2>
          <p className="mt-1 text-sm text-neutral-500">Classes represented in current teacher-subject assignments.</p>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-primary-600" style={{ width: `${coverageRate}%` }} /></div>
          <div className="mt-3 flex items-end justify-between gap-4"><p className="text-3xl font-semibold tracking-tight text-neutral-950">{coverageRate}%</p><p className="text-right text-xs text-neutral-500">{populatedClasses.size}/{classes.length} classes</p></div>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-4 sm:px-6"><h2 className="font-semibold text-neutral-950">Teaching workload</h2><p className="mt-1 text-sm text-neutral-500">Current assignment count by teacher.</p></div>
        {topAssigned.length === 0 ? <p className="px-5 py-8 text-sm text-neutral-500 sm:px-6">No teacher assignments found.</p> : <div className="divide-y divide-neutral-100">{topAssigned.map(({ teacher, count }) => <div key={teacher.id} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"><div className="min-w-0"><p className="truncate font-medium text-neutral-900">{teacher.full_name}</p><p className="mt-0.5 text-xs text-neutral-500">{teacher.username ? `@${teacher.username}` : "Teacher"}</p></div><div className="text-right"><p className="font-semibold text-neutral-900">{count}</p><p className="text-xs text-neutral-500">assignments</p></div></div>)}</div>}
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <Insight title="Needs attention" value={uncoveredTeachers.length ? `${uncoveredTeachers.length} teacher${uncoveredTeachers.length === 1 ? "" : "s"} without assignments` : "No uncovered teachers"} text={uncoveredTeachers.length ? "Review teaching assignments through the appropriate academic workflow." : "Every active teacher currently has at least one subject-class assignment."} />
        <Insight title="Owner workflow" value="Observe → escalate" text="Use this page for staffing visibility and leadership decisions; send record changes and account administration to the Clerk." />
      </section>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium text-neutral-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">{value}</p><p className="mt-1 text-xs text-neutral-500">{detail}</p></div>;
}

function Insight({ title, value, text }: { title: string; value: string; text: string }) {
  return <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">{title}</p><p className="mt-2 text-lg font-semibold text-neutral-950">{value}</p><p className="mt-1 text-sm leading-6 text-neutral-500">{text}</p></div>;
}
