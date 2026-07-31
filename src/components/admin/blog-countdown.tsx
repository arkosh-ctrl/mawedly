"use client";

import { useEffect, useState } from "react";

// Live countdown to a scheduled publish time. Client-side because a
// server-rendered "in 3 hours" is stale the moment it is cached.

function remaining(target: number): string {
  const ms = target - Date.now();
  if (ms <= 0) return "منشور الآن";

  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `بعد ${minutes} دقيقة`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `بعد ${hours} ساعة`;

  const days = Math.floor(hours / 24);
  return `بعد ${days} يوم`;
}

export function BlogCountdown({ publishedAt }: { publishedAt: string }) {
  const target = Date.parse(publishedAt);
  const [label, setLabel] = useState(() => remaining(target));

  useEffect(() => {
    const id = setInterval(() => setLabel(remaining(target)), 30_000);
    return () => clearInterval(id);
  }, [target]);

  if (Number.isNaN(target)) return null;

  return (
    <span className="rounded-full border border-warning/40 bg-warning-light px-2.5 py-0.5 text-xs text-ink">
      {label}
    </span>
  );
}
