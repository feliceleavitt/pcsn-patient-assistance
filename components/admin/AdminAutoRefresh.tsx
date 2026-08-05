"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminAutoRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      setLastRefresh(new Date());
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs, router]);

  return (
    <p className="text-sm text-slate-500">
      Auto-refresh is on.{" "}
      {lastRefresh ? `Last checked ${lastRefresh.toLocaleTimeString()}.` : ""}
    </p>
  );
}
