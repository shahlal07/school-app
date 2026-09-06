import core from "./core";

/**
 * Merges the core dictionary (common/nav/status/terms/intelligence/
 * ownerDashboard/emptyStates) with per-domain page dictionaries. Each new
 * role/page domain gets its OWN file here (e.g. `./principal.ts`) rather
 * than editing core.ts directly, specifically so multiple people/agents can
 * add translations in parallel without touching the same file.
 */
const en = {
  ...core
};

export default en;
