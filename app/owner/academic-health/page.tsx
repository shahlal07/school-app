import { requireRole } from "@/lib/auth/session";
import { getAcademicIntelligenceData } from "@/lib/examination/academic-intelligence-data";
import { AcademicIntelligence } from "@/components/examination/academic-intelligence";

export default async function OwnerAcademicHealthPage(){
  await requireRole("owner");
  const data=await getAcademicIntelligenceData();
  return <AcademicIntelligence {...data} roleLabel="Owner" interventionHref="/owner/interventions" resultsHref="/owner/results"/>;
}
