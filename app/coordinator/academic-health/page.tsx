import { requireRole } from "@/lib/auth/session";
import { getAcademicIntelligenceData } from "@/lib/examination/academic-intelligence-data";
import { AcademicIntelligence } from "@/components/examination/academic-intelligence";

export default async function CoordinatorAcademicHealthPage(){
  await requireRole("academic_coordinator");
  const data=await getAcademicIntelligenceData();
  return <AcademicIntelligence {...data} roleLabel="Academic Coordinator" interventionHref="/coordinator/interventions" resultsHref="/coordinator/results"/>;
}
