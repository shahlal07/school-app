"use client";

import { useState } from "react";

import { AttendanceDonut } from "@/components/shared/dashboard-charts";

export interface AttendanceAggregate {
  present: number;
  absent: number;
  late: number;
  excused: number;
}

interface AttendanceOverviewToggleProps {
  today: AttendanceAggregate;
  sevenDay: AttendanceAggregate;
  thirtyDay: AttendanceAggregate;
  labels: { today: string; sevenDay: string; thirtyDay: string };
}

/**
 * Client-side segmented control over three server-computed aggregates
 * (today/7-day/30-day) - no new data fetching happens here, it just swaps
 * which pre-fetched real aggregate is displayed.
 */
export function AttendanceOverviewToggle({ today, sevenDay, thirtyDay, labels }: AttendanceOverviewToggleProps) {
  const [range, setRange] = useState<"today" | "sevenDay" | "thirtyDay">("today");
  const data = range === "today" ? today : range === "sevenDay" ? sevenDay : thirtyDay;

  return (
    <div>
      <div className="mb-3 inline-flex rounded-lg border border-neutral-200 p-0.5 text-xs">
        {(["today", "sevenDay", "thirtyDay"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setRange(key)}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              range === key ? "bg-primary-600 text-white" : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {labels[key]}
          </button>
        ))}
      </div>
      <AttendanceDonut present={data.present} absent={data.absent} late={data.late} excused={data.excused} />
    </div>
  );
}
