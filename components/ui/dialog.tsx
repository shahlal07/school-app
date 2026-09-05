"use client";

import React, { useEffect, useRef, useCallback } from "react";
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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
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
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
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
  }, [open, handleKeyDown]);

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
