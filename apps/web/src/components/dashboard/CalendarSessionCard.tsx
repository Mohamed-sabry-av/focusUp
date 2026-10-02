"use client";

import Link from "next/link";
import { Shuffle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@focusUp/ui/components/avatar";

import { joinOpensAt, joinState } from "@/lib/session-join";
import { buildSelectedSlot } from "@/lib/selected-slot";

export interface CalendarSession {
  id: string;
  scheduledAt: string;
  durationMin: number;
  user1?: { id: string; displayName: string; avatarUrl: string | null } | null;
  user2?: { id: string; displayName: string; avatarUrl: string | null } | null;
}

interface CalendarSessionCardProps {
  session: CalendarSession;
  currentUserId: string | undefined;
  now: Date;
  /** Pixels from the top of the day column. */
  top: number;
  height: number;
}

/** A matched session on the calendar. The Join button appears 5 minutes before the start. */
export function CalendarSessionCard({ session, currentUserId, now, top, height }: CalendarSessionCardProps) {
  const partner = session.user1?.id === currentUserId ? session.user2 : session.user1;
  const state = joinState(session.scheduledAt, session.durationMin, now);
  const { timeRange } = buildSelectedSlot(new Date(session.scheduledAt), session.durationMin);
  const opensAt = joinOpensAt(session.scheduledAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      className="absolute left-1 right-2 z-20 overflow-hidden rounded-xl border-l-4 border-[#0245A3] bg-[#eef0fa] shadow-sm"
      style={{ top, height }}
    >
      <div className="flex h-full items-start gap-2 p-2">
        <Avatar className="h-7 w-7 shrink-0 rounded-lg border border-white shadow-sm">
          <AvatarImage src={partner?.avatarUrl ?? undefined} />
          <AvatarFallback className="rounded-lg bg-[#8FBAF3]/30 text-[10px] font-bold text-[#0245A3]">
            {partner?.displayName?.charAt(0) ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-bold text-slate-800">{timeRange}</div>
          <div className="truncate text-[10px] text-slate-500">{partner?.displayName ?? "Matching..."}</div>
          {state === "open" ? (
            <Link
              href={`/session/${session.id}`}
              className="mt-1 inline-flex h-6 items-center rounded-md bg-[#0245A3] px-3 text-[11px] font-semibold text-white hover:bg-[#033a88]"
            >
              Join
            </Link>
          ) : state === "later" ? (
            <div className="mt-1 text-[10px] text-slate-400">Join opens at {opensAt}</div>
          ) : null}
        </div>
        <Shuffle className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
      </div>
    </div>
  );
}
