"use client";

import { useState, useTransition } from "react";
import { generateExamSet } from "./actions";
import { Button } from "@/components/ui/button";

/**
 * Per-class "Generate next set" control. Only ever rendered when the caller
 * has already established canManage (see page.tsx) - the server action
 * itself also re-checks the role strictly, so this is UX only, not the
 * security boundary.
 */
export function GenerateSetForm({ classId }: { classId: string }) {
  const [startDate, setStartDate] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error: string | null } | null>(null);

  const handleGenerate = () => {
    setResult(null);
    startTransition(async () => {
      const res = await generateExamSet(classId, startDate || null);
      setResult(res);
    });
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-neutral-300 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-neutral-500">
          Start date (optional)
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block h-10 rounded-lg border border-neutral-300 px-3 text-sm text-neutral-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
          />
        </label>
        <Button type="button" size="sm" onClick={handleGenerate} loading={pending}>
          Generate next set
        </Button>
      </div>
      {result?.error && <p className="text-xs text-danger-600">{result.error}</p>}
      {result && !result.error && (
        <p className="text-xs text-success-700">Exam set generated.</p>
      )}
    </div>
  );
}
