"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Class, Subject } from "@/types/examination";
import {
  generateSchedule,
  type ChapterWithTopics,
  type GeneratedScheduleItem
} from "@/lib/scheduling/generate-schedule";
import { ConfirmDialog } from "@/components/examination/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { saveGeneratedSchedule } from "@/app/owner/schedule/actions";
import {
  ExistingScheduleList,
  PreviewScheduleList,
  type ScheduleItemRow
} from "@/components/examination/schedule-list";

export interface ScheduleGeneratorProps {
  classes: Class[];
  subjectsByClass: Record<string, Subject[]>;
  chaptersWithTopicsBySubject: Record<string, ChapterWithTopics[]>;
  scheduleItemsBySubject: Record<string, ScheduleItemRow[]>;
  /** Days of week (0=Sun..6=Sat) eligible by default, from the real school calendar's weekend setting. */
  defaultTestDaysOfWeek?: number[];
  /** Holiday dates (ISO yyyy-mm-dd) from calendar_overrides, pre-filled so they don't need re-entering here. */
  defaultHolidays?: string[];
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface GeneratorFormProps {
  subject: Subject;
  classId: string;
  chapters: ChapterWithTopics[];
  existingItems: ScheduleItemRow[];
  defaultTestDaysOfWeek: number[];
  defaultHolidays: string[];
}

function GeneratorForm({
  subject,
  classId,
  chapters,
  existingItems,
  defaultTestDaysOfWeek,
  defaultHolidays
}: GeneratorFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [startDate, setStartDate] = useState(todayISO());
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set(defaultTestDaysOfWeek));
  const [holidayDraft, setHolidayDraft] = useState("");
  const [holidays, setHolidays] = useState<string[]>(defaultHolidays);
  const [includeChapterTest, setIncludeChapterTest] = useState(true);
  const [preview, setPreview] = useState<GeneratedScheduleItem[] | null>(null);
  const [confirmingSave, setConfirmingSave] = useState(false);
  const [saving, setSaving] = useState(false);

  const daysValid = selectedDays.size > 0;

  const toggleDay = (day: number) => {
    setPreview(null);
    setSelectedDays((current) => {
      const next = new Set(current);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  };

  const addHoliday = () => {
    if (!holidayDraft) return;
    setHolidays((current) =>
      current.includes(holidayDraft) ? current : [...current, holidayDraft].sort()
    );
    setHolidayDraft("");
    setPreview(null);
  };

  const removeHoliday = (date: string) => {
    setHolidays((current) => current.filter((d) => d !== date));
    setPreview(null);
  };

  const handlePreview = () => {
    if (!daysValid) return;
    const items = generateSchedule({
      chapters,
      startDate,
      testDaysOfWeek: Array.from(selectedDays),
      holidays,
      includeChapterTest
    });
    setPreview(items);
  };

  const doSave = async () => {
    if (!preview) return;
    setSaving(true);
    const result = await saveGeneratedSchedule({
      classId,
      subjectId: subject.id,
      items: preview
    });
    setSaving(false);
    setConfirmingSave(false);

    if (result.error) {
      toast(result.error, "danger");
      return;
    }

    toast(`${result.count ?? preview.length} schedule item(s) created`, "success");
    setPreview(null);
    router.refresh();
  };

  const handleSaveClick = () => {
    if (!preview) return;
    if (existingItems.length > 0) {
      setConfirmingSave(true);
      return;
    }
    void doSave();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate schedule</CardTitle>
        <p className="mt-1 text-sm text-neutral-500">
          {chapters.length} {chapters.length === 1 ? "chapter" : "chapters"} in the syllabus for{" "}
          {subject.name}.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Input
          type="date"
          label="Start date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setPreview(null);
          }}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-neutral-700">Eligible test days</span>
          <div className="grid grid-cols-7 gap-1">
            {DAY_LABELS.map((label, day) => {
              const isSelected = selectedDays.has(day);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleDay(day)}
                  className={`rounded-lg py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 ${
                    isSelected
                      ? "bg-primary-600 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {!daysValid && (
            <p className="text-xs text-danger-600">Select at least one day of the week.</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-neutral-700">Holidays / skip dates</span>
          <p className="text-xs text-neutral-500">
            Pre-filled from the school calendar (Coordinator → Calendar). Add or remove for this
            run only - it won&apos;t change the calendar itself.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <input
              type="date"
              value={holidayDraft}
              onChange={(e) => setHolidayDraft(e.target.value)}
              className="h-11 min-w-0 flex-1 rounded-xl border border-neutral-300 px-3 text-sm text-neutral-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
              aria-label="Holiday date"
            />
            <Button type="button" variant="secondary" size="md" onClick={addHoliday}>
              Add
            </Button>
          </div>
          {holidays.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {holidays.map((date) => (
                <span
                  key={date}
                  className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 py-1 pl-3 pr-1.5 text-xs font-medium text-neutral-700"
                >
                  {date}
                  <button
                    type="button"
                    onClick={() => removeHoliday(date)}
                    aria-label={`Remove holiday ${date}`}
                    className="rounded-full p-0.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M4 4l8 8M12 4l-8 8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <label className="flex items-center gap-2.5 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={includeChapterTest}
            onChange={(e) => {
              setIncludeChapterTest(e.target.checked);
              setPreview(null);
            }}
            className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          Include a chapter test after each chapter
        </label>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            onClick={handlePreview}
            disabled={!daysValid}
            className="sm:flex-1"
          >
            Preview
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSaveClick}
            disabled={!preview || preview.length === 0}
            loading={saving}
            className="sm:flex-1"
          >
            Save schedule
          </Button>
        </div>

        {preview && (
          <div className="rounded-xl border border-neutral-200">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2.5">
              <span className="text-sm font-semibold text-neutral-900">Preview</span>
              <Badge variant="info">{preview.length} items</Badge>
            </div>
            <div className="max-h-96 overflow-y-auto px-4">
              {preview.length === 0 ? (
                <p className="py-4 text-sm text-neutral-500">Nothing to schedule.</p>
              ) : (
                <PreviewScheduleList items={preview} />
              )}
            </div>
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirmingSave}
        title="Schedule items already exist"
        description={`${subject.name} already has ${existingItems.length} scheduled item(s). Saving will add ${
          preview?.length ?? 0
        } more on top of them - existing items are not touched.`}
        confirmLabel="Save anyway"
        onClose={() => setConfirmingSave(false)}
        onConfirm={doSave}
      />
    </Card>
  );
}

function ScheduleGeneratorInner({
  classes,
  subjectsByClass,
  chaptersWithTopicsBySubject,
  scheduleItemsBySubject,
  defaultTestDaysOfWeek = [1, 2, 3, 4, 5],
  defaultHolidays = []
}: ScheduleGeneratorProps) {
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(classes[0]?.id);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>(undefined);

  const subjects = useMemo(
    () => (selectedClassId ? subjectsByClass[selectedClassId] ?? [] : []),
    [selectedClassId, subjectsByClass]
  );

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  const selectedChapters = selectedSubjectId
    ? chaptersWithTopicsBySubject[selectedSubjectId] ?? []
    : [];
  const selectedExistingItems = selectedSubjectId
    ? scheduleItemsBySubject[selectedSubjectId] ?? []
    : [];

  if (classes.length === 0) {
    return (
      <EmptyState
        title="No classes found"
        description="Classes need to be seeded before schedules can be generated."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Classes"
        className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1"
      >
        {classes.map((klass) => {
          const isSelected = klass.id === selectedClassId;
          return (
            <button
              key={klass.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => {
                setSelectedClassId(klass.id);
                setSelectedSubjectId(undefined);
              }}
              className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
                isSelected
                  ? "bg-primary-600 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {klass.name}
            </button>
          );
        })}
      </div>

      {subjects.length === 0 ? (
        <EmptyState
          title="No subjects for this class"
          description="Subjects for this class have not been seeded yet."
        />
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {subjects.map((subject) => {
            const hasChapters = (chaptersWithTopicsBySubject[subject.id] ?? []).length > 0;
            const isSelected = subject.id === selectedSubjectId;
            return (
              <button
                key={subject.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedSubjectId(subject.id)}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
                  isSelected
                    ? "bg-primary-600 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {subject.name}
                {!hasChapters && (
                  <span
                    className={`text-[10px] font-normal ${
                      isSelected ? "text-white/80" : "text-neutral-400"
                    }`}
                  >
                    (no syllabus)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectedSubject && (
        <div className="flex flex-col gap-4">
          {selectedExistingItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Already scheduled for {selectedSubject.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <ExistingScheduleList items={selectedExistingItems} />
              </CardContent>
            </Card>
          )}

          {selectedChapters.length === 0 ? (
            <EmptyState
              title="No syllabus yet"
              description={`${selectedSubject.name} has no chapters or topics set up, so a schedule can't be generated for it yet. Add chapters and topics in the syllabus manager first.`}
            />
          ) : (
            <GeneratorForm
              key={selectedSubject.id}
              subject={selectedSubject}
              classId={selectedSubject.class_id}
              chapters={selectedChapters}
              existingItems={selectedExistingItems}
              defaultTestDaysOfWeek={defaultTestDaysOfWeek}
              defaultHolidays={defaultHolidays}
            />
          )}
        </div>
      )}
    </div>
  );
}

export function ScheduleGenerator(props: ScheduleGeneratorProps) {
  return (
    <ToastProvider>
      <ScheduleGeneratorInner {...props} />
    </ToastProvider>
  );
}
