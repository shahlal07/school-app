import { requireAnyRole } from "@/lib/auth/session";
import { getAcademicIntelligenceData } from "@/lib/examination/academic-intelligence-data";
import { AcademicIntelligence } from "@/components/examination/academic-intelligence";
import { getT } from "@/lib/i18n/get-translator";

export default async function CoordinatorAcademicHealthPage(){
  await requireAnyRole(["owner","academic_coordinator"]);
  const data=await getAcademicIntelligenceData();
  const t=await getT();
  return <AcademicIntelligence {...data} roleLabel={t("coordinator.academicHealth.roleLabel")} interventionHref="/coordinator/interventions" resultsHref="/coordinator/results"/>;
}
