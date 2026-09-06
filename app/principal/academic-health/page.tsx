import { requireRole } from "@/lib/auth/session";
import { getAcademicIntelligenceData } from "@/lib/examination/academic-intelligence-data";
import { AcademicIntelligence } from "@/components/examination/academic-intelligence";

export default async function PrincipalAcademicHealthPage(){
  await requireRole("principal");
  const data=await getAcademicIntelligenceData();
  return <AcademicIntelligence {...data} roleLabel="Principal" interventionHref="/principal/interventions" resultsHref="/principal/results"/>;
}
