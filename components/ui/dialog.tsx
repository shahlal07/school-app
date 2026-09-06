"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export function Dialog({ open, onClose, title, description, children }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Keep the latest onClose in a ref rather than an effect dependency.
  // Every call site passes an inline `() => setOpen(false)`, a new function
  // reference on every parent render (e.g. every keystroke in a form field
  // inside the dialog). If onClose were a dependency of the effect below,
  // it would re-run on every one of those renders and re-steal focus to the
  // dialog wrapper via the setTimeout - which is exactly the bug that made
  // every dialog in the app need a re-click after each typed character.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCloseRef.current();
      }
      if (e.key === "Tab" && contentRef.current) {
        const focusable = contentRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusTimeout = setTimeout(() => contentRef.current?.focus(), 0);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(focusTimeout);
      document.body.style.overflow = "";
      previouslyFocused?.focus();
    };
    // Intentionally only re-run when the dialog opens/closes, not on every
    // parent re-render - see onCloseRef comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? "dialog-title" : undefined}
      aria-describedby={description ? "dialog-description" : undefined}
    >
      <div
        ref={contentRef}
        tabIndex={-1}
        className="w-full max-w-lg sm:rounded-2xl rounded-t-2xl bg-white shadow-dialog p-6 outline-none"
      >
        {title && (
          <h2 id="dialog-title" className="text-lg font-semibold text-neutral-900 mb-1">
            {title}
          </h2>
        )}
        {description && (
          <p id="dialog-description" className="text-sm text-neutral-500 mb-4">
            {description}
          </p>
        )}
        <div>{children}</div>
      </div>
    </div>,
    document.body
  );
}
