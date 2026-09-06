import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Department } from "@/types/database";
import { getT } from "@/lib/i18n/get-translator";
import { Bdi } from "@/components/shared/bdi";

export default async function DepartmentsPage() {
  const supabase = createClient();
  const t = await getT();
  const { data } = await supabase.from("departments").select("*").order("name", { ascending: true });
  const departments = (data as Department[] | null) ?? [];

  return (
    <main className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">{t("nav.departments")}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {t("owner.departments.subtitle")}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((department) => (
          <Card key={department.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle><Bdi>{department.name}</Bdi></CardTitle>
                <Badge variant={department.is_active ? "success" : "neutral"}>
                  {department.is_active ? t("status.active") : t("owner.departments.notBuiltYet")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-500">
                {department.description ? <Bdi>{department.description}</Bdi> : t("owner.departments.noDescription")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
