"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { UpcomingSession } from "@focusUp/shared-types";

import { useSetSessionTitle } from "@/hooks/useSessionRoom";
import { taskLabel } from "@/lib/booking-options";
import { JOIN_OPENS_BEFORE_MIN, joinState } from "@/lib/session-join";
import { clockLabel, dayLabel } from "@/lib/session-format";
import { PartnerCard } from "./PartnerCard";
import { SessionMenu } from "./SessionMenu";
import { SessionTasksList } from "./SessionTasksList";

interface SessionDetailsPanelProps {
  session: UpcomingSession;
  now: Date;
  onBack: () => void;
  onCancel: (session: UpcomingSession) => void;
  onReportBlock: (session: UpcomingSession) => void;
}

/**
 * Everything about one upcoming session: when, the title, the partner, my settings (read only),
 * my tasks, and Join / Cancel. Give it `key={session.id}` so the title field starts fresh.
 */
export function SessionDetailsPanel({ session, now, onBack, onCancel, onReportBlock }: SessionDetailsPanelProps) {
  const start = new Date(session.scheduledAt);
  const state = joinState(session.scheduledAt, session.durationMin, now);
  const setTitle = useSetSessionTitle(session.id);
  const [title, setTitleText] = useState(session.title ?? "");

  const saveTitle = () => {
    const value = title.trim();
    if (!value || value === (session.title ?? "")) return;
    setTitle.mutate(value, { onError: (error) => toast.error(error.message) });
  };

  return (
    <div className="flex h-full w-full flex-col bg-white md:w-[300px]">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to my profile"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </button>
        <SessionMenu session={session} onCancel={onCancel} onReportBlock={onReportBlock} />
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <header>
          <h2 className="text-lg font-bold text-slate-900">Session at {clockLabel(start)}</h2>
          <p className="text-xs text-slate-500">
            {session.durationMin} min · {dayLabel(start)}
          </p>
          <label className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:border-[#0245A3]">
            <input
              value={title}
              onChange={(event) => setTitleText(event.target.value)}
              onBlur={saveTitle}
              onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
              maxLength={200}
              placeholder="Add a session title..."
              aria-label="Session title"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
            <Pencil className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
          </label>
        </header>

        {session.partner ? (
          <PartnerCard partner={session.partner} />
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Waiting for a partner.</p>
        )}

        <section aria-label="Session settings">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Session settings</h3>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">My task</dt>
              <dd className="font-medium text-slate-800">{taskLabel(session.taskType)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Quiet mode</dt>
              <dd className="font-medium text-slate-800">{session.quiet ? "On" : "Off"}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[11px] leading-snug text-slate-400">
            To change these, cancel this session and book again.
          </p>
        </section>

        <SessionTasksList sessionId={session.id} />
      </div>

      <div className="shrink-0 space-y-2 border-t border-slate-100 p-4">
        {state === "open" ? (
          <Link
            href={`/session/${session.id}`}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-[#0245A3] text-sm font-bold text-white hover:brightness-110"
          >
            Join session
          </Link>
        ) : (
          <>
            <button
              type="button"
              disabled
              className="h-11 w-full cursor-not-allowed rounded-xl bg-[#0245A3]/40 text-sm font-bold text-white"
            >
              Join session
            </button>
            <p className="text-center text-[11px] text-slate-500">
              You can join your session {JOIN_OPENS_BEFORE_MIN} minutes before it starts.
            </p>
          </>
        )}
        <button
          type="button"
          onClick={() => onCancel(session)}
          className="w-full py-1.5 text-sm font-semibold text-red-600 hover:underline"
        >
          Cancel session
        </button>
      </div>
    </div>
  );
}
