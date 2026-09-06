/**
 * Generic system-chrome dictionary (shared low-level UI primitives - toast,
 * confirm dialog defaults, 404/error boundaries). Namespaced under `system`.
 * New keys only - anything already in core.ts should be reused instead.
 */
const system = {
  dismissNotification: "Dismiss notification",
  confirm: "Confirm",
  notFoundTitle: "Page not found",
  notFoundDescription: "The page you're looking for doesn't exist or may have been moved.",
  backToHome: "Back to home",
  errorTitle: "Something went wrong",
  errorDescription: "An unexpected error occurred. Please try again.",
  tryAgain: "Try again"
} as const;

export default system;
