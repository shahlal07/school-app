import type { StaffRole } from "@/types/database";

export const STAFF_ROLES: StaffRole[] = [
  "owner",
  "principal",
  "academic_coordinator",
  "clerk",
  "teacher"
];

export const ROLE_LABELS: Record<StaffRole, string> = {
  owner: "Owner (supreme authority)",
  principal: "Principal",
  academic_coordinator: "Academic Coordinator",
  clerk: "Clerk",
  teacher: "Teacher"
};

/** Where a role's own dashboard lives - used for the login redirect and for
 * sending a signed-in user back to their own dashboard if they hit a route
 * that belongs to a different role. */
export const ROLE_HOME_PATH: Record<StaffRole, string> = {
  owner: "/owner",
  principal: "/principal",
  academic_coordinator: "/coordinator",
  clerk: "/clerk",
  teacher: "/teacher"
};

export function isStaffRole(value: string): value is StaffRole {
  return (STAFF_ROLES as string[]).includes(value);
}
