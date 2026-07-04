"use client";

import { useCallback, useEffect, useState } from "react";

export const VIEW_MODES = ["list", "cards", "calendar"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

const STORAGE_KEY = "mawedly.appointments.view";
const DEFAULT_VIEW: ViewMode = "list";

function isViewMode(value: unknown): value is ViewMode {
  return (
    typeof value === "string" &&
    (VIEW_MODES as readonly string[]).includes(value)
  );
}

/**
 * Persists the merchant's preferred appointments layout in localStorage.
 * SSR-safe: renders the default on the server and first client paint, then
 * hydrates the stored preference in an effect to avoid a hydration mismatch.
 */
export function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const [view, setView] = useState<ViewMode>(DEFAULT_VIEW);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isViewMode(stored)) setView(stored);
    } catch {
      // Access to storage can throw (privacy mode); keep the default silently.
    }
  }, []);

  const update = useCallback((mode: ViewMode) => {
    setView(mode);
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Non-fatal — the preference simply won't persist.
    }
  }, []);

  return [view, update];
}
