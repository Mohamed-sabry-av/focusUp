"use client";

import { ShieldAlert } from "lucide-react";

import { useCurrentUser } from "@/hooks/useUser";
import { activeSuspensionEnd, formatDateTime } from "@/lib/booking-errors";

/** Shown while the account is suspended (5 strikes in 30 days): booking is paused until the date shown. */
export function SuspensionBanner() {
  const { data } = useCurrentUser();
  const user = data?.data?.user as { suspendedUntil?: string | null } | undefined;
  const end = activeSuspensionEnd(user?.suspendedUntil);

  if (!end) return null;

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-red-50 border-b border-red-200 px-4 py-2.5 text-sm text-red-900"
    >
      <span className="flex items-center gap-2 font-medium">
        <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden />
        Your account is suspended until <strong>{formatDateTime(end.toISOString())}</strong>{" "}
        because of missed sessions. You cannot book until then.
      </span>
    </div>
  );
}
