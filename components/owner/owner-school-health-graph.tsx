type GraphPoint = { label: string; value: number };

export function OwnerSchoolHealthGraph({ points }: { points: GraphPoint[] }) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-neutral-950">School health</h2>
          <p className="mt-0.5 text-[11px] text-neutral-500">Current executive health signals across the school.</p>
        </div>
        <span className="text-[10px] font-medium text-neutral-400">0–100</span>
      </div>
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="space-y-4">
          {points.map((point) => (
            <div key={point.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-neutral-800">{point.label}</span>
                <span className="text-xs font-bold tabular-nums text-neutral-950">{point.value}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-primary-500 transition-all duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, point.value))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-5 text-[9px] text-neutral-400">
          {[0, 25, 50, 75, 100].map((tick) => <span key={tick} className={tick === 100 ? "text-right" : ""}>{tick}</span>)}
        </div>
      </div>
    </section>
  );
}
