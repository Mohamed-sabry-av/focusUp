"use client";

import { Clock, Users } from "lucide-react";
import type { UpcomingSession } from "@focusUp/shared-types";
import { Avatar, AvatarFallback, AvatarImage } from "@focusUp/ui/components/avatar";

import { partnerTimeLabel } from "@/lib/partner-time";

interface PartnerCardProps {
  partner: NonNullable<UpcomingSession["partner"]>;
}

/** Who you will work with: first name and last initial, photo, how many sessions, and their local time. */
export function PartnerCard({ partner }: PartnerCardProps) {
  const sessions = `${partner.completedSessions} ${partner.completedSessions === 1 ? "session" : "sessions"}`;

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <Avatar className="mb-3 h-16 w-16 rounded-2xl">
        <AvatarImage src={partner.avatarUrl ?? undefined} className="object-cover" />
        <AvatarFallback className="rounded-2xl bg-[#8FBAF3]/40 text-xl font-bold text-[#0245A3]">
          {partner.displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="text-base font-bold text-slate-900">{partner.displayName}</div>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
        <Users className="h-3.5 w-3.5" aria-hidden /> {sessions}
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
        <Clock className="h-3.5 w-3.5" aria-hidden /> {partnerTimeLabel(partner.timezone, new Date())}
      </div>
    </div>
  );
}
