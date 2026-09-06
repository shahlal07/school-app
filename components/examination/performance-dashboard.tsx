import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ClassPerformance,
  PassRateStat,
  WeakTopic
} from "@/components/examination/performance-types";
import { passRateVariant } from "@/components/examination/performance-types";

function PassRateBadge({ passRate }: { passRate: number }) {
  return <Badge variant={passRateVariant(passRate)}>{passRate}%</Badge>;
}

function OverallCard({ overall }: { overall: PassRateStat }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Overall pass rate</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-3xl font-semibold text-neutral-900">{overall.passRate}%</span>
          <PassRateBadge passRate={overall.passRate} />
          <span className="text-sm text-neutral-500">
            {overall.passed} of {overall.total} graded results passed
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ClassPerformanceCard({ classPerf }: { classPerf: ClassPerformance }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>{classPerf.className}</CardTitle>
        <PassRateBadge passRate={classPerf.passRate} />
      </CardHeader>
      <CardContent>
        <p className="text-sm text-neutral-500">
          {classPerf.passed} of {classPerf.total} graded results passed
        </p>

        {classPerf.subjects.length > 0 && (
          <ul className="mt-3 divide-y divide-neutral-100 border-t border-neutral-100">
            {classPerf.subjects.map((subject) => (
              <li
                key={subject.subjectId}
                className="flex items-center justify-between gap-3 py-2"
              >
                <span className="min-w-0 truncate text-sm text-neutral-700">
                  {subject.subjectName}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-neutral-400">
                    {subject.passed}/{subject.total}
                  </span>
                  <PassRateBadge passRate={subject.passRate} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function WeakTopicsCard({ topics }: { topics: WeakTopic[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weakest topics</CardTitle>
      </CardHeader>
      <CardContent>
        {topics.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No topic has at least a few graded results yet, so none can be flagged as weak.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100 border-t border-neutral-100">
            {topics.map((topic) => (
              <li key={topic.topicId} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-800">
                    {topic.topicName}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {topic.className} &middot; {topic.subjectName} &middot; {topic.chapterName}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <PassRateBadge passRate={topic.passRate} />
                  <span className="text-xs text-neutral-400">{topic.total} results</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export interface PerformanceDashboardProps {
  overall: PassRateStat;
  classPerformances: ClassPerformance[];
  weakestTopics: WeakTopic[];
}

export function PerformanceDashboard({
  overall,
  classPerformances,
  weakestTopics
}: PerformanceDashboardProps) {
  return (
    <div className="flex flex-col gap-5">
      <OverallCard overall={overall} />

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Per-class pass rate</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classPerformances.map((classPerf) => (
            <ClassPerformanceCard key={classPerf.classId} classPerf={classPerf} />
          ))}
        </div>
      </div>

      <WeakTopicsCard topics={weakestTopics} />
    </div>
  );
}
