import { Bdi } from "@/components/shared/bdi";

export interface TrendPoint {
  setLabel: string;
  average: number | null;
  passRate: number | null;
}

export interface DeltaResult {
  text: string;
  positive: boolean | null;
}

/**
 * Shared dashboard visual primitives (ring, line chart, donut, stat tiles)
 * used across all 5 role dashboards (owner/principal/coordinator/teacher/
 * clerk). Originally defined locally in app/owner/page.tsx - extracted here
 * so every dashboard renders identical shapes instead of drifting copies.
 * Pure presentation only - every value plotted is passed in as a prop;
 * nothing here fetches or invents data.
 */

export function deltaText(delta: number | null, suffix: string): DeltaResult {
  if (delta === null) return { text: "—", positive: null };
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return { text: `0${suffix}`, positive: null };
  return { text: `${rounded > 0 ? "+" : ""}${rounded}${suffix}`, positive: rounded > 0 };
}

export function ScoreRing({
  value,
  size = 84,
  stroke = 9,
  color = "#0d9488",
  track = "#eef2f3"
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

export function TrendChart({ points }: { points: TrendPoint[] }) {
  const width = 520;
  const height = 150;
  const padL = 34;
  const padR = 10;
  const padT = 10;
  const padB = 22;
  const usable = points.filter((p) => p.average !== null || p.passRate !== null);
  if (usable.length < 2) return null;

  const x = (i: number) => padL + (i * (width - padL - padR)) / Math.max(1, points.length - 1);
  const y = (v: number) => padT + (height - padT - padB) * (1 - v / 100);

  const line = (key: "average" | "passRate") =>
    points
      .map((p, i) => (p[key] === null ? null : `${x(i)},${y(p[key] as number)}`))
      .filter((v): v is string => v !== null)
      .join(" ");

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {[0, 25, 50, 75, 100].map((tick) => (
        <g key={tick}>
          <line x1={padL} x2={width - padR} y1={y(tick)} y2={y(tick)} stroke="#f1f3f4" strokeWidth={1} />
          <text x={0} y={y(tick) + 3} fontSize={9} fill="#93a2ac">{tick}%</text>
        </g>
      ))}
      <polyline points={line("average")} fill="none" stroke="#0d9488" strokeWidth={2.5} />
      <polyline points={line("passRate")} fill="none" stroke="#2563eb" strokeWidth={2.5} strokeDasharray="4 3" />
      {points.map((p, i) =>
        p.average === null ? null : <circle key={`a-${i}`} cx={x(i)} cy={y(p.average)} r={3} fill="#0d9488" />
      )}
      {points.map((p, i) =>
        p.passRate === null ? null : <circle key={`p-${i}`} cx={x(i)} cy={y(p.passRate)} r={3} fill="#2563eb" />
      )}
      {points.map((p, i) => (
        <text key={`l-${i}`} x={x(i)} y={height - 4} fontSize={9} fill="#93a2ac" textAnchor="middle">{p.setLabel}</text>
      ))}
    </svg>
  );
}

export function RiskDonut({ academic, attendance, both }: { academic: number; attendance: number; both: number }) {
  const total = academic + attendance + both;
  const size = 96;
  const r = 34;
  const c = 2 * Math.PI * r;
  const segs = total === 0
    ? []
    : [
        { value: academic, color: "#0d9488" },
        { value: attendance, color: "#f59e0b" },
        { value: both, color: "#dc2626" }
      ];
  let offsetAcc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2f3" strokeWidth={12} />
        {segs.map((seg, i) => {
          const frac = seg.value / total;
          const dash = frac * c;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={12}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offsetAcc}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offsetAcc += dash;
          return el;
        })}
        <text x={size / 2} y={size / 2 - 2} textAnchor="middle" fontSize={20} fontWeight={700} fill="#0f1b24">{total}</text>
        <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fontSize={9} fill="#93a2ac">at risk</text>
      </svg>
      <div className="flex flex-col gap-1.5 text-xs">
        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary-600" /><span className="text-neutral-600">Academic <Bdi>{academic}</Bdi></span></div>
        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning-500" /><span className="text-neutral-600">Attendance <Bdi>{attendance}</Bdi></span></div>
        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-danger-600" /><span className="text-neutral-600">Both <Bdi>{both}</Bdi></span></div>
      </div>
    </div>
  );
}

/**
 * Present/Absent/Late/Excused 4-segment donut (coordinator's Attendance
 * Overview). Matches the real attendance_daily_report view's column set
 * exactly (present_count/absent_count/late_count/excused_count) - there is
 * no separate "leave" bucket in the schema, so this deliberately doesn't
 * invent one. Distinct from RiskDonut (3-segment, fixed academic/attendance/
 * both palette) since the segment set and colors differ.
 */
export function AttendanceDonut({
  present,
  absent,
  late,
  excused
}: {
  present: number;
  absent: number;
  late: number;
  excused: number;
}) {
  const total = present + absent + late + excused;
  const size = 112;
  const r = 40;
  const c = 2 * Math.PI * r;
  const segs = total === 0
    ? []
    : [
        { value: present, color: "#16a34a", label: "Present" },
        { value: absent, color: "#dc2626", label: "Absent" },
        { value: late, color: "#d97706", label: "Late" },
        { value: excused, color: "#6b7280", label: "Excused" }
      ].filter((s) => s.value > 0);
  let offsetAcc = 0;
  const pct = total === 0 ? null : Math.round((present / total) * 1000) / 10;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2f3" strokeWidth={13} />
        {segs.map((seg) => {
          const frac = seg.value / total;
          const dash = frac * c;
          const el = (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={13}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offsetAcc}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offsetAcc += dash;
          return el;
        })}
        <text x={size / 2} y={size / 2 - 2} textAnchor="middle" fontSize={18} fontWeight={700} fill="#0f1b24">
          {pct === null ? "—" : `${pct}%`}
        </text>
        <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fontSize={9} fill="#93a2ac">present</text>
      </svg>
      <div className="flex flex-col gap-1.5 text-xs">
        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success-600" /><span className="text-neutral-600">Present <Bdi>{present}</Bdi></span></div>
        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-danger-600" /><span className="text-neutral-600">Absent <Bdi>{absent}</Bdi></span></div>
        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning-600" /><span className="text-neutral-600">Late <Bdi>{late}</Bdi></span></div>
        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neutral-500" /><span className="text-neutral-600">Excused <Bdi>{excused}</Bdi></span></div>
      </div>
    </div>
  );
}

export function StatTile({
  label,
  value,
  delta,
  deltaSuffix,
  invert
}: {
  label: string;
  value: string | number;
  delta: DeltaResult;
  deltaSuffix: string;
  invert?: boolean;
}) {
  const positive = invert && delta.positive !== null ? !delta.positive : delta.positive;
  return (
    <div className="rounded-xl border border-neutral-200 p-3">
      <p className="text-[11px] font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-900"><Bdi>{value}</Bdi></p>
      <p className={`mt-0.5 text-[11px] font-medium ${positive === null ? "text-neutral-400" : positive ? "text-success-600" : "text-danger-600"}`}>
        {delta.text} <span className="text-neutral-400">{deltaSuffix}</span>
      </p>
    </div>
  );
}

export function MiniStat({ label, value, delta }: { label: string; value: string; delta: DeltaResult }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-3">
      <p className="text-[11px] font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-900">{value}</p>
      <p className={`mt-0.5 text-[11px] font-medium ${delta.positive === null ? "text-neutral-400" : delta.positive ? "text-success-600" : "text-danger-600"}`}>{delta.text}</p>
    </div>
  );
}

/**
 * Plain stat tile with no delta - for counts that don't have a meaningful
 * "vs last period" comparison yet (e.g. clerk's Pending Documents).
 */
export function PlainStatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-3">
      <p className="text-[11px] font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-900"><Bdi>{value}</Bdi></p>
    </div>
  );
}
