"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-actions";

interface FormErrors {
  email?: string;
  password?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): FormErrors {
    const nextErrors: FormErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = "Email is required.";
    } else if (!isValidEmail(trimmedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
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
      const result = await signIn(email.trim(), password);

      if (result.error) {
        setServerError(result.error);
      }
    } catch {
      setServerError("Unable to sign in. Please try again.");
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
            aria-label="Dismiss error"
            className="shrink-0 rounded p-0.5 text-danger-500 transition-colors hover:text-danger-700 focus:outline-none focus:ring-2 focus:ring-danger-500 focus:ring-offset-1"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      ) : null}

      <Input
        id="email"
        name="email"
        type="email"
        label="Email"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);

          if (errors.email) {
            setErrors((current) => ({ ...current, email: undefined }));
          }

          if (serverError) {
            setServerError(null);
          }
        }}
        error={errors.email}
        autoComplete="email"
        disabled={loading}
      />

      <Input
        id="password"
        name="password"
        type="password"
        label="Password"
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
        Sign in
      </Button>
    </form>
  );
}
