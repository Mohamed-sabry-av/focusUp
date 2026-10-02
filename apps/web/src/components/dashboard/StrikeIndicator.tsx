"use client";

import { TriangleAlert } from "lucide-react";

import { useUserStats } from "@/hooks/useUser";
import { strikeLabel } from "@/lib/quota-text";

/** "Strikes: 2 of 5 (last 30 days)". Only shown once there is at least one strike. */
export function StrikeIndicator() {
  const { data } = useUserStats();
  const strikes = (data?.data?.strikesInLast30Days as number | undefined) ?? 0;
  const label = strikeLabel(strikes);

  if (!label) return null;

  return (
    <div
      className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
      title="5 strikes in 30 days pause booking for 3 days. Strikes older than 30 days stop counting."
    >
      <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
      <div>
        <div className="font-bold">{label}</div>
        <div className="mt-0.5 leading-snug">
          Missed sessions and late cancellations (under 1 hour) are strikes. 5 in 30 days pause booking for 3 days.
        </div>
      </div>
    </div>
  );
}
