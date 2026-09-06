import { requireRole } from "@/lib/auth/session";
import { getAcademicIntelligenceData } from "@/lib/examination/academic-intelligence-data";
import { AcademicIntelligence } from "@/components/examination/academic-intelligence";
import { getT } from "@/lib/i18n/get-translator";

export default async function PrincipalAcademicHealthPage(){
  await requireRole("principal");
  const t=await getT();
  const data=await getAcademicIntelligenceData();
  return <AcademicIntelligence {...data} roleLabel={t("principal.academicHealth.roleLabel")} interventionHref="/principal/interventions" resultsHref="/principal/results"/>;
}
