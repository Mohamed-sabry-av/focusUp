"use client";

import Link from "next/link";
import { Hourglass, X } from "lucide-react";
import { toast } from "sonner";
import type { UpcomingSession, WaitingBooking } from "@focusUp/shared-types";
import { Avatar, AvatarFallback, AvatarImage } from "@focusUp/ui/components/avatar";

import { useCancelSession } from "@/hooks/useSessionRoom";
import { clockLabel } from "@/lib/session-format";
import { groupByDay } from "@/lib/session-groups";
import { joinState } from "@/lib/session-join";
import { SessionMenu } from "./SessionMenu";

interface UpcomingSessionsCardProps {
  /** Sessions with a partner. */
  sessions: UpcomingSession[];
  /** Bookings still looking for a partner. */
  waiting: WaitingBooking[];
  now: Date;
  onOpen: (session: UpcomingSession) => void;
  onCancel: (session: UpcomingSession) => void;
  onReportBlock: (session: UpcomingSession) => void;
}

type Entry =
  | { kind: "session"; key: string; scheduledAt: string; session: UpcomingSession }
  | { kind: "waiting"; key: string; scheduledAt: string; booking: WaitingBooking };

/** The "Upcoming" list: matched sessions and bookings still waiting for a partner, by day. */
export function UpcomingSessionsCard({ sessions, waiting, now, onOpen, onCancel, onReportBlock }: UpcomingSessionsCardProps) {
  const cancelWaiting = useCancelSession();

  const entries: Entry[] = [
    ...sessions.map((session): Entry => ({ kind: "session", key: session.id, scheduledAt: session.scheduledAt, session })),
    ...waiting.map((booking): Entry => ({ kind: "waiting", key: booking.id, scheduledAt: booking.slotTime, booking })),
  ].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  if (entries.length === 0) return null;

  return (
    <section aria-label="Upcoming sessions" className="space-y-3">
      <h3 className="text-sm font-bold text-[#001945]">Upcoming</h3>
      {groupByDay(entries, now).map((group) => (
        <div key={group.key} className="space-y-2">
          <div className="text-xs font-semibold text-slate-500">{group.label}</div>
          {group.items.map((entry) => {
            const start = new Date(entry.scheduledAt);

            if (entry.kind === "waiting") {
              const { booking } = entry;
              const end = new Date(start.getTime() + booking.durationMin * 60_000);
              return (
                <div key={entry.key} className="rounded-xl border-l-4 border-slate-400 bg-slate-50 p-2.5">
                  <div className="flex items-start gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-500">
                      <Hourglass className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-slate-700">
                        {clockLabel(start)} - {clockLabel(end)}
                      </span>
                      <span className="block truncate text-[11px] text-slate-500">Looking for a partner...</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-bold text-slate-500">{booking.durationMin}</span>
                    <button
                      type="button"
                      aria-label="Cancel this booking"
                      onClick={() =>
                        cancelWaiting.mutate(booking.id, {
                          onSuccess: () => toast.success("Booking cancelled"),
                          onError: (error) => toast.error(error.message),
                        })
                      }
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-red-600"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              );
            }

            const { session } = entry;
            const end = new Date(start.getTime() + session.durationMin * 60_000);
            const open = joinState(session.scheduledAt, session.durationMin, now) === "open";
            return (
              <div key={entry.key} className="rounded-xl border-l-4 border-[#0245A3] bg-[#eef0fa] p-2.5">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen(session)}
                    className="flex min-w-0 flex-1 items-start gap-2 text-left"
                    aria-label={`Open details of the session at ${clockLabel(start)}`}
                  >
                    <Avatar className="h-7 w-7 shrink-0 rounded-lg border border-white shadow-sm">
                      <AvatarImage src={session.partner?.avatarUrl ?? undefined} />
                      <AvatarFallback className="rounded-lg bg-[#8FBAF3]/30 text-[10px] font-bold text-[#0245A3]">
                        {session.partner?.displayName.charAt(0).toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-slate-800">
                        {clockLabel(start)} - {clockLabel(end)}
                      </span>
                      <span className="block truncate text-[11px] text-slate-500">
                        {session.partner?.displayName ?? "Matching..."}
                      </span>
                    </span>
                  </button>
                  <span className="shrink-0 text-[10px] font-bold text-slate-500">{session.durationMin}</span>
                </div>
                <div className="mt-2 flex items-center gap-1">
                  {open ? (
                    <Link
                      href={`/session/${session.id}`}
                      className="inline-flex h-6 items-center rounded-md bg-[#0245A3] px-3 text-[11px] font-semibold text-white hover:bg-[#033a88]"
                    >
                      Join
                    </Link>
                  ) : (
                    <span className="inline-flex h-6 items-center rounded-md bg-[#0245A3]/40 px-3 text-[11px] font-semibold text-white">
                      Join
                    </span>
                  )}
                  <span className="flex-1" />
                  <SessionMenu session={session} onCancel={onCancel} onReportBlock={onReportBlock} />
                  <button
                    type="button"
                    aria-label="Cancel session"
                    onClick={() => onCancel(session)}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-white/70 hover:text-red-600"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
