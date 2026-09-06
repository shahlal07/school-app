import core from "./core";
import owner from "./owner";
import principal from "./principal";
import coordinator from "./coordinator";
import clerk from "./clerk";
import auth from "./auth";
import system from "./system";
import alerts from "./alerts";
import attendanceLeadership from "./attendanceLeadership";
import teacher from "./teacher";
import intelligenceExtra from "./intelligence-extra";

/**
 * Merges the core dictionary (common/nav/status/terms/intelligence/
 * ownerDashboard/emptyStates) with per-domain page dictionaries. Each new
 * role/page domain gets its OWN file here (e.g. `./principal.ts`) rather
 * than editing core.ts directly, specifically so multiple people/agents can
 * add translations in parallel without touching the same file.
 *
 * `teacher.ts` already nests everything under its own top-level `teacher`
 * key, so spreading it in is safe alongside `owner`/`principal`/`clerk`,
 * which are each namespaced as their own top-level key here.
 */
const en = {
  ...core,
  owner,
  principal,
  coordinator,
  clerk,
  auth,
  system,
  alerts,
  attendanceLeadership,
  ...teacher,
  intelligence: { ...core.intelligence, ...intelligenceExtra.intelligence }
};

export default en;
