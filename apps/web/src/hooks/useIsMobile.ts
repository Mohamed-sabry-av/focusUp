"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 767px)";

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** True on a phone-sized screen (the dashboard switches to its mobile layout below 768 px). */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
