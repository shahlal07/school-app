"use client";

import { useEffect, useState } from "react";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RenameDialogProps {
  open: boolean;
  title: string;
  label?: string;
  initialValue: string;
  onSubmit: (name: string) => Promise<string | null>;
  onClose: () => void;
}

export function RenameDialog({
  open,
  title,
  label = "Name",
  initialValue,
  onSubmit,
  onClose
}: RenameDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setError(null);
    }
  }, [open, initialValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await onSubmit(value.trim());
    setSubmitting(false);
    if (result) {
      setError(result);
      return;
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label={label}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={error ?? undefined}
          autoFocus
          maxLength={200}
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
