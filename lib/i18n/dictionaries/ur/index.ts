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

const ur = {
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

export default ur;
