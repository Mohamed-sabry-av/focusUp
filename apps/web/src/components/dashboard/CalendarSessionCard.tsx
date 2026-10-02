"use client";

import Link from "next/link";
import { X } from "lucide-react";
import type { UpcomingSession } from "@focusUp/shared-types";
import { Avatar, AvatarFallback, AvatarImage } from "@focusUp/ui/components/avatar";
import { cn } from "@focusUp/ui/lib/utils";

import { clockLabel } from "@/lib/session-format";
import { joinOpensAt, joinState } from "@/lib/session-join";
import { SessionMenu } from "./SessionMenu";

interface CalendarSessionCardProps {
  session: UpcomingSession;
  now: Date;
  /** Pixels from the top of the day column. */
  top: number;
  height: number;
  selected: boolean;
  /** Open this session's details. */
  onOpen: (session: UpcomingSession) => void;
  onCancel: (session: UpcomingSession) => void;
  onReportBlock: (session: UpcomingSession) => void;
}

/**
 * A matched session on the calendar: the partner (first name and last initial), a more-options
 * menu, an X to cancel, and a Join button from 5 minutes before the start. Clicking it opens the details.
 */
export function CalendarSessionCard({
  session,
  now,
  top,
  height,
  selected,
  onOpen,
  onCancel,
  onReportBlock,
}: CalendarSessionCardProps) {
  const { partner } = session;
  const start = new Date(session.scheduledAt);
  const end = new Date(start.getTime() + session.durationMin * 60_000);
  const state = joinState(session.scheduledAt, session.durationMin, now);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Session at ${clockLabel(start)} with ${partner?.displayName ?? "a partner"}. Open details`}
      onClick={() => onOpen(session)}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onOpen(session);
        }
      }}
      className={cn(
        "absolute left-1 right-2 z-20 cursor-pointer overflow-hidden rounded-xl border-l-4 border-[#0245A3] bg-[#eef0fa] shadow-sm outline-none transition-colors hover:bg-[#e4e8f5] focus-visible:ring-2 focus-visible:ring-[#0245A3]",
        selected && "ring-2 ring-[#0245A3]",
      )}
      style={{ top, height }}
    >
      <div className="flex h-full items-start gap-2 p-2">
        <Avatar className="h-7 w-7 shrink-0 rounded-lg border border-white shadow-sm">
          <AvatarImage src={partner?.avatarUrl ?? undefined} />
          <AvatarFallback className="rounded-lg bg-[#8FBAF3]/30 text-[10px] font-bold text-[#0245A3]">
            {partner?.displayName.charAt(0).toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-bold text-slate-800">
            {clockLabel(start)} - {clockLabel(end)}
          </div>
          <div className="truncate text-[10px] text-slate-500">{partner?.displayName ?? "Matching..."}</div>
          {state === "open" ? (
            <Link
              href={`/session/${session.id}`}
              onClick={(event) => event.stopPropagation()}
              className="mt-1 inline-flex h-6 items-center rounded-md bg-[#0245A3] px-3 text-[11px] font-semibold text-white hover:bg-[#033a88]"
            >
              Join
            </Link>
          ) : state === "later" ? (
            <div className="mt-1 text-[10px] text-slate-400">
              Join opens at {clockLabel(joinOpensAt(session.scheduledAt))}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center">
          <SessionMenu session={session} onCancel={onCancel} onReportBlock={onReportBlock} />
          <button
            type="button"
            aria-label="Cancel session"
            onClick={(event) => {
              event.stopPropagation();
              onCancel(session);
            }}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-white/70 hover:text-red-600"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
