"use client";

import { useEffect, useState } from "react";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface NameDescriptionDialogProps {
  open: boolean;
  title: string;
  nameLabel?: string;
  descriptionLabel?: string;
  initialName?: string;
  initialDescription?: string;
  submitLabel?: string;
  onSubmit: (values: { name: string; description: string }) => Promise<string | null>;
  onClose: () => void;
}

export function NameDescriptionDialog({
  open,
  title,
  nameLabel = "Name",
  descriptionLabel = "Description (optional)",
  initialName = "",
  initialDescription = "",
  submitLabel = "Save",
  onSubmit,
  onClose
}: NameDescriptionDialogProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setDescription(initialDescription);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialName, initialDescription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await onSubmit({ name: name.trim(), description: description.trim() });
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
          label={nameLabel}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error ?? undefined}
          autoFocus
          maxLength={200}
        />
        <Textarea
          label={descriptionLabel}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
