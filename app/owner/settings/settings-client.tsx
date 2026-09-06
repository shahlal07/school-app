"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToastProvider, useToast } from "@/components/ui/toast";

import { updatePassPercentage } from "./actions";

interface SettingsClientProps {
  initialPassPercentage: number;
}

function SettingsInner({ initialPassPercentage }: SettingsClientProps) {
  const { toast } = useToast();
  const [value, setValue] = useState(String(initialPassPercentage));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = Number(value);
    setError(null);
    setSaving(true);
    const result = await updatePassPercentage(parsed);
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    toast("Pass percentage updated", "success");
  };

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">Settings</h1>
      <p className="mt-1 text-sm text-neutral-500">School-wide examination settings.</p>

      <div className="mt-5 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Pass percentage</CardTitle>
            <p className="mt-1 text-sm text-neutral-500">
              The minimum percentage a student needs to pass any test. Applies school-wide -
              every result&apos;s pass/fail status is computed against this value automatically.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <p role="alert" className="text-sm text-danger-600">
                  {error}
                </p>
              )}
              <div className="max-w-[160px]">
                <Input
                  label="Pass percentage"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={100}
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                />
              </div>
              <Button type="submit" loading={saving} className="self-start">
                Save
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function SettingsClient(props: SettingsClientProps) {
  return (
    <ToastProvider>
      <SettingsInner {...props} />
    </ToastProvider>
  );
}
