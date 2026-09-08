import type { Class, Section, Student } from "@/types/examination";

interface OwnerStudentOverviewProps {
  classes: Class[];
  sections: Section[];
  students: Student[];
}

export function OwnerStudentOverview({ classes, sections, students }: OwnerStudentOverviewProps) {
  const activeStudents = students.filter((student) => student.is_active);
  const inactiveStudents = students.length - activeStudents.length;
  const classRows = classes.map((klass) => {
    const count = activeStudents.filter((student) => student.class_id === klass.id).length;
    const sectionCount = sections.filter((section) => section.class_id === klass.id).length;
    return { klass, count, sectionCount };
  });
  const populated = classRows.filter((row) => row.count > 0).length;
  const largest = classRows.reduce<(typeof classRows)[number] | null>((current, row) => (!current || row.count > current.count ? row : current), null);
  const activeRate = students.length ? Math.round((activeStudents.length / students.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">Owner · Students</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">Student directory</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">Executive visibility into enrolment, class distribution and roster health. Routine record editing stays with the Clerk.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Active students" value={activeStudents.length} detail="Current enrolled roster" />
        <Metric label="Inactive records" value={inactiveStudents} detail="Excluded from class totals" />
        <Metric label="Classes populated" value={`${populated}/${classes.length}`} detail="Classes with active students" />
        <Metric label="Largest class" value={largest ? largest.klass.name : "—"} detail={largest ? `${largest.count} active students` : "No roster data"} />
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-4 sm:px-6">
          <h2 className="font-semibold text-neutral-950">Class distribution</h2>
          <p className="mt-1 text-sm text-neutral-500">Active students by class and section coverage.</p>
        </div>
        <div className="divide-y divide-neutral-100">
          {classRows.length === 0 ? <p className="px-5 py-8 text-sm text-neutral-500 sm:px-6">No classes found.</p> : classRows.map(({ klass, count, sectionCount }) => (
            <div key={klass.id} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
              <div className="min-w-0"><p className="font-medium text-neutral-900">{klass.name}</p><p className="mt-0.5 text-xs text-neutral-500">{sectionCount} {sectionCount === 1 ? "section" : "sections"}{klass.group_name ? ` · ${klass.group_name}` : ""}</p></div>
              <div className="text-right"><p className="font-semibold text-neutral-900">{count}</p><p className="text-xs text-neutral-500">students</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <Insight title="Roster health" value={students.length ? `${activeRate}% active` : "No data"} text="Active roster records currently contributing to school-wide counts." />
        <Insight title="Owner workflow" value="Observe → escalate" text="Use this view for visibility; send record corrections and routine roster work to the Clerk." />
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
