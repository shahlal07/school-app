/**
 * Auth-page dictionary (login/sign-in). Namespaced under `auth`. New keys
 * only - anything already in core.ts (common/nav/status/terms/...) should be
 * reused instead of duplicated here.
 */
const auth = {
  signInToYourAccount: "Sign in to your account",
  usernameOrEmailLabel: "Username or email",
  usernameOrEmailRequired: "Username or email is required.",
  passwordLabel: "Password",
  passwordRequired: "Password is required.",
  dismissError: "Dismiss error",
  signIn: "Sign in",
  unableToSignIn: "Unable to sign in. Please try again.",
  genericSignInError: "Unable to sign in.",
  accountNotActive: "This account is not active. Contact the school owner."
} as const;

export default auth;
