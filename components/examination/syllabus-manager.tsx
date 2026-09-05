"use client";

import { useMemo, useState } from "react";

import type { Chapter, Class, Subject, Topic } from "@/types/examination";
import { EmptyState } from "@/components/ui/empty-state";
import { ToastProvider } from "@/components/ui/toast";
import { SubjectCard } from "@/components/examination/subject-card";

export interface SyllabusManagerProps {
  classes: Class[];
  subjectsByClass: Record<string, Subject[]>;
  chaptersBySubject: Record<string, Chapter[]>;
  topicsByChapter: Record<string, Topic[]>;
}

function SyllabusManagerInner({
  classes,
  subjectsByClass,
  chaptersBySubject,
  topicsByChapter
}: SyllabusManagerProps) {
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(classes[0]?.id);
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);

  const subjects = useMemo(
    () => (selectedClassId ? subjectsByClass[selectedClassId] ?? [] : []),
    [selectedClassId, subjectsByClass]
  );

  if (classes.length === 0) {
    return (
      <EmptyState
        title="No classes found"
        description="Classes need to be seeded before the syllabus can be managed."
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
                setExpandedSubjectId(null);
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
        <ul className="flex flex-col gap-3">
          {subjects.map((subject) => (
            <li key={subject.id}>
              <SubjectCard
                subject={subject}
                chapters={chaptersBySubject[subject.id] ?? []}
                topicsByChapter={topicsByChapter}
                expanded={expandedSubjectId === subject.id}
                onToggleExpand={() =>
                  setExpandedSubjectId((current) => (current === subject.id ? null : subject.id))
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SyllabusManager(props: SyllabusManagerProps) {
  return (
    <ToastProvider>
      <SyllabusManagerInner {...props} />
    </ToastProvider>
  );
}
