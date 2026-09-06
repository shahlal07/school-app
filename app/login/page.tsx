import { LoginForm } from "./login-form";
import { InstallPwaBanner } from "@/components/shared/install-pwa-banner";
import { getT } from "@/lib/i18n/get-translator";

export default async function LoginPage() {
  const t = await getT();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-[400px]">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              School OS
            </h1>
            <p className="mt-2 text-sm text-neutral-500">{t("auth.signInToYourAccount")}</p>
          </div>

          <LoginForm />
        </div>
      </div>

      <InstallPwaBanner />
    </main>
  );
}
