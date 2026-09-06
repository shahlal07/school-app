"use client";

import { useState, useTransition } from "react";
import { findNextEligibleExamDay } from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Read-only proof that next_eligible_exam_day()/get_exam_day_status() are
 * reachable from the app. Available to owner and coordinator alike (see
 * findNextEligibleExamDay in ./actions.ts) since it has no side effects.
 */
export function NextEligibleDayWidget() {
  const [fromDate, setFromDate] = useState(todayISO());
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    error: string | null;
    eligibleDate: string | null;
    isEligible: boolean | null;
    reason: string | null;
  } | null>(null);

  const handleCheck = () => {
    startTransition(async () => {
      const res = await findNextEligibleExamDay(fromDate);
      setResult(res);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-500">
        Find the next date on or after a given date that is eligible for exam scheduling
        (not a weekend or a declared holiday, per the current calendar overrides).
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          From date
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="mt-1 block h-11 rounded-xl border border-neutral-300 px-3 text-sm text-neutral-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
          />
        </label>
        <Button type="button" variant="secondary" onClick={handleCheck} loading={pending}>
          Find next eligible day
        </Button>
      </div>
      {result && (
        <div className="rounded-xl border border-neutral-200 p-3 text-sm">
          {result.error ? (
            <p className="text-danger-600">{result.error}</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-neutral-900">{result.eligibleDate}</span>
              {result.isEligible !== null && (
                <Badge variant={result.isEligible ? "success" : "warning"}>
                  {result.isEligible ? "eligible" : "not eligible"}
                </Badge>
              )}
              {result.reason && <span className="text-neutral-500">{result.reason}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
