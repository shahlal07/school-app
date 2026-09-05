"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as unknown as { MSStream?: boolean }).MSStream;
    setIsIos(ios);

    const stored = localStorage.getItem("school-os-install-dismissed");
    if (stored === "true") setDismissed(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("school-os-install-dismissed", "true");
    setDismissed(true);
  };

  if (isStandalone || dismissed) return null;
  if (!deferredPrompt && !isIos) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-bottom">
      <div className="mx-auto max-w-md rounded-2xl bg-neutral-900 p-4 shadow-dialog">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white font-bold text-lg">
            S
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Install School OS</p>
            <p className="mt-0.5 text-xs text-neutral-300">
              {deferredPrompt
                ? "Add this app to your home screen for quick access."
                : 'Tap the Share button below, then tap "Add to Home Screen".'}
            </p>
            <div className="mt-3 flex gap-2">
              {deferredPrompt && (
                <Button variant="primary" size="sm" onClick={handleInstall}>
                  Install
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-neutral-300 hover:text-white hover:bg-neutral-800"
                onClick={handleDismiss}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
