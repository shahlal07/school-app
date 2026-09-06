import { Spinner } from "@/components/ui/spinner";

export default function TeacherLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <Spinner />
    </div>
  );
}
