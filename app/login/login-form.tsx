"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-actions";
import { useTranslation } from "@/lib/i18n/locale-provider";

interface FormErrors {
  identifier?: string;
  password?: string;
}

export function LoginForm() {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): FormErrors {
    const nextErrors: FormErrors = {};
    const trimmedIdentifier = identifier.trim();

    if (!trimmedIdentifier) {
      nextErrors.identifier = t("auth.usernameOrEmailRequired");
    }

    if (!password) {
      nextErrors.password = t("auth.passwordRequired");
    }

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setServerError(null);

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);

    try {
      const result = await signIn(identifier.trim(), password);

      if (result.error) {
        setServerError(result.error);
      }
    } catch {
      setServerError(t("auth.unableToSignIn"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {serverError ? (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-danger-200 bg-danger-50 px-3 py-3 text-sm text-danger-700"
        >
          <p>{serverError}</p>

          <button
            type="button"
            onClick={() => setServerError(null)}
            aria-label={t("auth.dismissError")}
            className="shrink-0 rounded p-0.5 text-danger-500 transition-colors hover:text-danger-700 focus:outline-none focus:ring-2 focus:ring-danger-500 focus:ring-offset-1"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      ) : null}

      <Input
        id="identifier"
        name="identifier"
        type="text"
        label={t("auth.usernameOrEmailLabel")}
        value={identifier}
        onChange={(event) => {
          setIdentifier(event.target.value);

          if (errors.identifier) {
            setErrors((current) => ({ ...current, identifier: undefined }));
          }

          if (serverError) {
            setServerError(null);
          }
        }}
        error={errors.identifier}
        autoComplete="username"
        disabled={loading}
      />

      <Input
        id="password"
        name="password"
        type="password"
        label={t("auth.passwordLabel")}
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);

          if (errors.password) {
            setErrors((current) => ({ ...current, password: undefined }));
          }

          if (serverError) {
            setServerError(null);
          }
        }}
        error={errors.password}
        autoComplete="current-password"
        disabled={loading}
      />

      <Button type="submit" loading={loading} className="w-full">
        {t("auth.signIn")}
      </Button>
    </form>
  );
}
