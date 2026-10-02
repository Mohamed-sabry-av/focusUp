"use client";

import { Clock } from "lucide-react";
import { cn } from "@focusUp/ui/lib/utils";

import type { BookingOptions as BookingOptionsValue } from "@/lib/booking-options";
import type { SelectedSlot, SlotOutcome } from "@/lib/selected-slot";
import { BookingOptions } from "./BookingOptions";
import { SelectedSessionsCard } from "./SelectedSessionsCard";
import { UpcomingSessionsCard } from "./UpcomingSessionsCard";
import type { UpcomingSession, WaitingBooking } from "@focusUp/shared-types";

interface BookingSidebarProps {
  duration: number;
  setDuration: (duration: number) => void;
  options: BookingOptionsValue;
  setOptions: (patch: Partial<BookingOptionsValue>) => void;
  selectedSlots: SelectedSlot[];
  outcomes: Record<string, SlotOutcome>;
  onRemoveSlot: (id: string) => void;
  onClearAll: () => void;
  /** Books every selected slot. */
  onBook: () => void;
  /** Called when Book is pressed with nothing selected (scroll the calendar and explain). */
  onBookWithoutSelection: () => void;
  isBooking: boolean;
  /** Why booking is not possible right now (for example a suspension), or null. */
  blockedReason: string | null;
  /** My matched sessions, shown as the Upcoming list. */
  upcomingSessions: UpcomingSession[];
  /** My bookings still waiting for a partner, listed in Upcoming too. */
  waitingBookings: WaitingBooking[];
  now: Date;
  onOpenSession: (session: UpcomingSession) => void;
  onCancelSession: (session: UpcomingSession) => void;
  onReportBlockSession: (session: UpcomingSession) => void;
  onCollapse?: () => void;
}

/** The left sidebar: Book, the session settings, and the list of selected sessions. */
export function BookingSidebar({
  duration,
  setDuration,
  options,
  setOptions,
  selectedSlots,
  outcomes,
  onRemoveSlot,
  onClearAll,
  onBook,
  onBookWithoutSelection,
  isBooking,
  blockedReason,
  upcomingSessions,
  waitingBookings,
  now,
  onOpenSession,
  onCancelSession,
  onReportBlockSession,
  onCollapse,
}: BookingSidebarProps) {
  const disabled = isBooking || blockedReason !== null;

  return (
    <div className="w-[272px] bg-white flex flex-col shrink-0 h-full">
      <div className="flex items-center justify-between px-4 pt-4 shrink-0">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Session</span>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            title="Collapse panel"
            aria-label="Collapse booking panel"
            className="text-slate-400 hover:text-slate-600 text-xs font-bold tracking-widest transition-colors"
          >
            «
          </button>
        )}
      </div>

      <div className="p-4 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
        <div>
          <button
            type="button"
            disabled={disabled}
            onClick={selectedSlots.length > 0 ? onBook : onBookWithoutSelection}
            className={cn(
              "w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
              "bg-[#0245A3] text-white shadow-lg shadow-[#0245A3]/20 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed",
            )}
          >
            <Clock className="w-4 h-4" aria-hidden />
            {isBooking
              ? "Booking..."
              : selectedSlots.length > 1
                ? `Book ${selectedSlots.length} sessions`
                : "Book"}
          </button>
          {blockedReason && (
            <p role="alert" className="mt-2 text-xs font-semibold text-red-600 leading-snug">
              {blockedReason}
            </p>
          )}
        </div>

        <div className="bg-[#F2FCFC] rounded-2xl border border-[#BDF1F6] p-4 space-y-4">
          <h3 className="font-bold text-[#001945] text-sm">Session Settings</h3>
          <BookingOptions
            duration={duration}
            onDurationChange={setDuration}
            options={options}
            onOptionsChange={setOptions}
          />
        </div>

        <SelectedSessionsCard
          slots={selectedSlots}
          outcomes={outcomes}
          onRemove={onRemoveSlot}
          onClearAll={onClearAll}
        />

        <UpcomingSessionsCard
          sessions={upcomingSessions}
          waiting={waitingBookings}
          now={now}
          onOpen={onOpenSession}
          onCancel={onCancelSession}
          onReportBlock={onReportBlockSession}
        />

        {selectedSlots.length === 0 && (
          <p className="rounded-2xl bg-[#BDF1F6]/40 border border-[#BDF1F6] p-4 text-xs font-semibold text-[#0245A3] leading-relaxed">
            Pick a time on the calendar, or click a person who is waiting. Press Book when you are
            ready. Partners are matched automatically.
          </p>
        )}
      </div>
    </div>
  );
}
