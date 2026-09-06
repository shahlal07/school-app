/**
 * Wraps a raw data value (student name, class name, "Set #004", a
 * percentage) so it never visually reverses inside an RTL (Urdu) layout.
 * Use this for anything that comes from the database or is a
 * number/identifier - never for translated UI text, which should already
 * flow correctly in the active direction.
 */
export function Bdi({ children }: { children: React.ReactNode }) {
  return <bdi>{children}</bdi>;
}
