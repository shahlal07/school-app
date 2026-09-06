import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Department } from "@/types/database";

export default async function DepartmentsPage() {
  const supabase = createClient();
  const { data } = await supabase.from("departments").select("*").order("name", { ascending: true });
  const departments = (data as Department[] | null) ?? [];

  return (
    <main className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">Departments</h1>
      <p className="mt-1 text-sm text-neutral-500">
        School OS is built to grow beyond examinations - each row here is a department that can
        become a fully-built module later, the same way Examination already is.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((department) => (
          <Card key={department.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{department.name}</CardTitle>
                <Badge variant={department.is_active ? "success" : "neutral"}>
                  {department.is_active ? "Active" : "Not built yet"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-500">
                {department.description ?? "No description yet."}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
