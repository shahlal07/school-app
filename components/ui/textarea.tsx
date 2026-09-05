import React, { useId } from "react";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export function Textarea({
  label,
  error,
  id,
  className = "",
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const errorId = `${textareaId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={textareaId}
        className="text-sm font-medium text-neutral-700"
      >
        {label}
      </label>
      <textarea
        id={textareaId}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={`min-h-[96px] rounded-xl border px-3 py-2 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400 ${
          error
            ? "border-danger-400 focus:border-danger-500 focus:ring-danger-500"
            : "border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
        } ${className}`}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-xs text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
