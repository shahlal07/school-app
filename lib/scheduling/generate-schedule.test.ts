import { generateSchedule } from "./generate-schedule.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`FAIL: ${message}\n  expected: ${e}\n  actual:   ${a}`);
  }
}

// --- Acceptance test: the exact sequence from the product spec ---
// Topic 1 -> Topic 2 -> Topic 3 -> Topic 4 -> Chapter Test -> next chapter
// Topic 1 -> Topic 2 -> ... -> next Chapter Test
{
  const chapters = [
    {
      chapterId: "ch1",
      chapterName: "Chapter 1",
      orderIndex: 1,
      topics: [
        { topicId: "t1", topicName: "Topic 1", orderIndex: 1 },
        { topicId: "t2", topicName: "Topic 2", orderIndex: 2 },
        { topicId: "t3", topicName: "Topic 3", orderIndex: 3 },
        { topicId: "t4", topicName: "Topic 4", orderIndex: 4 }
      ]
    },
    {
      chapterId: "ch2",
      chapterName: "Chapter 2",
      orderIndex: 2,
      topics: [
        { topicId: "t5", topicName: "Topic 1", orderIndex: 1 },
        { topicId: "t6", topicName: "Topic 2", orderIndex: 2 }
      ]
    }
  ];

  // Every day of the week eligible, no holidays - isolates the sequencing
  // logic itself from the day-skipping logic (tested separately below).
  const items = generateSchedule({
    chapters,
    startDate: "2025-09-15", // a Monday
    testDaysOfWeek: [0, 1, 2, 3, 4, 5, 6]
  });

  assertEqual(
    items.map((i) => i.testType),
    ["topic", "topic", "topic", "topic", "chapter", "topic", "topic", "chapter"],
    "test type sequence must be topic*4, chapter, topic*2, chapter"
  );

  assertEqual(
    items.map((i) => i.topicId),
    ["t1", "t2", "t3", "t4", null, "t5", "t6", null],
    "topicId sequence must follow chapter order, null for chapter tests"
  );

  assertEqual(
    items.map((i) => i.chapterId),
    ["ch1", "ch1", "ch1", "ch1", "ch1", "ch2", "ch2", "ch2"],
    "chapterId must stay on ch1 through its chapter test, then switch to ch2"
  );

  // Dates must be strictly sequential (every day eligible in this case).
  assertEqual(
    items.map((i) => i.date),
    [
      "2025-09-15",
      "2025-09-16",
      "2025-09-17",
      "2025-09-18",
      "2025-09-19",
      "2025-09-20",
      "2025-09-21",
      "2025-09-22"
    ],
    "dates must be consecutive when every day of week is eligible"
  );

  console.log("PASS: acceptance sequence (topic->topic->...->chapter test->next chapter)");
}

// --- Day-of-week + holiday skipping ---
{
  const chapters = [
    {
      chapterId: "ch1",
      chapterName: "Chapter 1",
      orderIndex: 1,
      topics: [
        { topicId: "t1", topicName: "Topic 1", orderIndex: 1 },
        { topicId: "t2", topicName: "Topic 2", orderIndex: 2 },
        { topicId: "t3", topicName: "Topic 3", orderIndex: 3 }
      ]
    }
  ];

  // Mon-Sat only (no Sunday), plus one holiday on a would-be test day.
  // 2025-09-15 is a Monday. Only Mon-Sat (1-6) eligible.
  const items = generateSchedule({
    chapters,
    startDate: "2025-09-15",
    testDaysOfWeek: [1, 2, 3, 4, 5, 6],
    holidays: ["2025-09-17"] // the Wednesday that would otherwise be topic 3
  });

  assertEqual(
    items.map((i) => i.date),
    ["2025-09-15", "2025-09-16", "2025-09-18", "2025-09-19"],
    "must skip Sunday (not in testDaysOfWeek) and the holiday, landing on the next eligible day each time"
  );
  assertEqual(
    items.map((i) => i.testType),
    ["topic", "topic", "topic", "chapter"],
    "3 topics + 1 chapter test"
  );

  console.log("PASS: weekend + holiday skipping");
}

// --- Start date itself ineligible (a Sunday, not in testDaysOfWeek) ---
{
  const chapters = [
    {
      chapterId: "ch1",
      chapterName: "Chapter 1",
      orderIndex: 1,
      topics: [{ topicId: "t1", topicName: "Topic 1", orderIndex: 1 }]
    }
  ];

  const items = generateSchedule({
    chapters,
    startDate: "2025-09-14", // a Sunday
    testDaysOfWeek: [1, 2, 3, 4, 5, 6],
    includeChapterTest: false
  });

  assertEqual(
    items.map((i) => i.date),
    ["2025-09-15"],
    "must advance from an ineligible start date to the first eligible day (Monday)"
  );

  console.log("PASS: ineligible start date advances forward");
}

// --- includeChapterTest: false ---
{
  const chapters = [
    {
      chapterId: "ch1",
      chapterName: "Chapter 1",
      orderIndex: 1,
      topics: [
        { topicId: "t1", topicName: "Topic 1", orderIndex: 1 },
        { topicId: "t2", topicName: "Topic 2", orderIndex: 2 }
      ]
    }
  ];

  const items = generateSchedule({
    chapters,
    startDate: "2025-09-15",
    testDaysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    includeChapterTest: false
  });

  assertEqual(
    items.map((i) => i.testType),
    ["topic", "topic"],
    "no chapter test should be inserted when includeChapterTest is false"
  );

  console.log("PASS: includeChapterTest=false omits chapter tests");
}

// --- Chapters out of order_index order must still be processed in order ---
{
  const chapters = [
    {
      chapterId: "ch2",
      chapterName: "Chapter 2",
      orderIndex: 2,
      topics: [{ topicId: "t2", topicName: "Topic 1", orderIndex: 1 }]
    },
    {
      chapterId: "ch1",
      chapterName: "Chapter 1",
      orderIndex: 1,
      topics: [{ topicId: "t1", topicName: "Topic 1", orderIndex: 1 }]
    }
  ];

  const items = generateSchedule({
    chapters,
    startDate: "2025-09-15",
    testDaysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    includeChapterTest: false
  });

  assertEqual(
    items.map((i) => i.chapterId),
    ["ch1", "ch2"],
    "must sort chapters by orderIndex regardless of input array order"
  );

  console.log("PASS: chapters sorted by orderIndex regardless of input order");
}

// --- Missing test days throws ---
{
  let threw = false;
  try {
    generateSchedule({
      chapters: [],
      startDate: "2025-09-15",
      testDaysOfWeek: []
    });
  } catch {
    threw = true;
  }
  assert(threw, "must throw when testDaysOfWeek is empty");
  console.log("PASS: empty testDaysOfWeek throws");
}

console.log("\nAll generate-schedule acceptance tests passed.");
