"use client";

import { useEffect, useMemo, useState } from "react";

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return days > 0 ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function CountdownTimer({ deadlineIso }: { deadlineIso: string }) {
  const deadline = useMemo(() => new Date(deadlineIso).getTime(), [deadlineIso]);
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline - Date.now()));
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, deadline - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [deadline]);
  const urgent = remaining > 0 && remaining <= 6 * 60 * 60 * 1000;
  return <span className={`font-mono tabular-nums ${urgent ? "text-red-600" : "text-neutral-900"}`}>{remaining === 0 ? "Deadline reached" : formatRemaining(remaining)}</span>;
}
