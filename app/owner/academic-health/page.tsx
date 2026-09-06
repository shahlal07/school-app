import { requireRole } from "@/lib/auth/session";
import { getAcademicIntelligenceData } from "@/lib/examination/academic-intelligence-data";
import { AcademicIntelligence } from "@/components/examination/academic-intelligence";
import { getT } from "@/lib/i18n/get-translator";

export default async function OwnerAcademicHealthPage(){
  await requireRole("owner");
  const t=await getT();
  const data=await getAcademicIntelligenceData();
  return <AcademicIntelligence {...data} roleLabel={t("owner.academicHealth.roleLabel")} interventionHref="/owner/interventions" resultsHref="/owner/results"/>;
}
