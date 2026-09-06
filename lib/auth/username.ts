/**
 * Most teachers at this school have no real email address. Supabase Auth
 * still needs an email-shaped identity internally, so username-based
 * accounts use a deterministic synthetic email that's never actually
 * delivered anywhere - both account creation and sign-in compute it the
 * same way from the username alone, so no extra lookup/storage is needed.
 */
const SYNTHETIC_EMAIL_DOMAIN = "teacher.schoolos.local";

export function usernameToSyntheticEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username.trim());
}

export function usernameValidationError(username: string): string | null {
  const trimmed = username.trim();
  if (!trimmed) return "Username is required.";
  if (!isValidUsername(trimmed)) {
    return "Username must be 3-32 characters: letters, numbers, dots, dashes, or underscores only.";
  }
  return null;
}
