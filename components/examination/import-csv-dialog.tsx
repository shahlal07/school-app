"use client";

import { ChangeEvent, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { parseCsv, validateStudentImport, type StudentImportResult } from "@/lib/utils/csv";
import { importStudents, type ImportSummary } from "@/app/owner/students/actions";

interface ImportCsvDialogProps {
  open: boolean;
  classId: string | undefined;
  sectionId: string | undefined;
  onClose: () => void;
  onImported: (summary: ImportSummary) => void;
}

export function ImportCsvDialog({
  open,
  classId,
  sectionId,
  onClose,
  onImported
}: ImportCsvDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<StudentImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    const text = await file.text();
    const rows = parseCsv(text);
    setResult(validateStudentImport(rows));
  };

  const handleClose = () => {
    setFileName(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  const handleImport = async () => {
    if (!classId || !sectionId || !result || result.valid.length === 0) return;

    setImporting(true);
    const response = await importStudents(classId, sectionId, result.valid);
    setImporting(false);

    if (response.error) {
      setError(response.error);
      return;
    }

    if (response.summary) {
      onImported(response.summary);
    }
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Import students from CSV"
      description="Header row must be exactly: name,roll_no,class,section"
    >
      <div className="flex flex-col gap-4">
        {error && (
          <p role="alert" className="text-sm text-danger-600">
            {error}
          </p>
        )}
        {(!classId || !sectionId) && (
          <p className="text-sm text-warning-700">Select a class and section before importing.</p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-200"
        />

        {result && (
          <div className="max-h-64 overflow-y-auto rounded-xl border border-neutral-200">
            <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-600">
              <span className="truncate">{fileName}</span>
              <div className="flex shrink-0 gap-2">
                <Badge variant="success">{result.valid.length} valid</Badge>
                {result.errors.length > 0 && (
                  <Badge variant="danger">{result.errors.length} errors</Badge>
                )}
              </div>
            </div>
            {result.errors.length > 0 && (
              <ul className="divide-y divide-neutral-100 px-3 py-2 text-xs text-danger-600">
                {result.errors.map((err, index) => (
                  <li key={index} className="py-1">
                    Row {err.row}: {err.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={importing}>
            Cancel
          </Button>
          <Button
            type="button"
            loading={importing}
            disabled={!result || result.valid.length === 0 || !classId || !sectionId}
            onClick={handleImport}
          >
            Import {result ? `${result.valid.length} student(s)` : ""}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
