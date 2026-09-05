/**
 * Pedagogical display order for the 13 seeded classes. Sorting by `name`
 * alphabetically would put "1" before "10" before "2", and would put
 * PG/Nursery/Prep in the wrong spots - so this order must be hardcoded and
 * used to sort classes for display instead.
 */
export const CLASS_ORDER = [
  "PG",
  "Nursery",
  "Prep",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10"
] as const;

export function classOrderIndex(name: string): number {
  const index = CLASS_ORDER.indexOf(name as (typeof CLASS_ORDER)[number]);
  return index === -1 ? CLASS_ORDER.length : index;
}
