"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect
} from "react";

type ToastVariant = "success" | "warning" | "danger" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const variantStyles: Record<ToastVariant, string> = {
  success: "bg-success-600 text-white",
  warning: "bg-warning-500 text-white",
  danger: "bg-danger-600 text-white",
  info: "bg-primary-600 text-white"
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const remove = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant?: ToastVariant) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      const timer = setTimeout(() => remove(id), 4000);
      timers.current.set(id, timer);
    },
    [remove]
  );

  useEffect(() => {
    const timersMap = timers.current;
    return () => {
      timersMap.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-4 left-4 right-4 z-50 flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-80"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-xl px-4 py-3 shadow-toast transition-all duration-300 ${
              variantStyles[t.variant ?? "info"]
            }`}
            role="status"
          >
            <span className="text-sm font-medium">{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              className="shrink-0 rounded-lg p-1 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/50"
              aria-label="Dismiss notification"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-current">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
