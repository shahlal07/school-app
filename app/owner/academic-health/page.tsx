import { requireRole } from "@/lib/auth/session";
import { getAcademicIntelligenceData } from "@/lib/examination/academic-intelligence-data";
import { OwnerAcademicHealth } from "@/components/owner/owner-academic-health";

export default async function OwnerAcademicHealthPage() {
  await requireRole("owner");
  const data = await getAcademicIntelligenceData();
  return (
    <OwnerAcademicHealth
      {...data}
      interventionHref="/owner/academic-health"
      resultsHref="/owner/academic-health"
    />
  );
}
