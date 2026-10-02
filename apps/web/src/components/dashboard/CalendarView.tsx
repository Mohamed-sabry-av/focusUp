"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@focusUp/ui/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Shuffle,
  MoreHorizontal,
  X,
} from "lucide-react";
import { useAvailableBookings, useWaitingBookings } from "@/hooks/useBookings";
import type { AvailableBooking } from "@/hooks/useBookings";
import { buildSelectedSlot, type SelectedSlot } from "@/lib/selected-slot";
import { isSlotBlocked, isTooSoon, type TimeBlock } from "@/lib/slot-overlap";
import { WaitingPerson } from "./WaitingPersonCard";
import { CalendarSessionCard } from "./CalendarSessionCard";
import { toast } from "sonner";
import type { UpcomingSession } from "@focusUp/shared-types";
import { useCancelSession } from "@/hooks/useSessionRoom";
import { useUpcomingSessions } from "@/hooks/useSessions";
import { useCurrentUser } from "@/hooks/useUser";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@focusUp/ui/components/avatar";
interface CalendarViewProps {
  /** The duration chosen in the sidebar, used for new slots. */
  durationSelected: number;
  /** A time was picked (an empty slot or a waiting person): add it to the selection. */
  onSlotSelected: (slot: SelectedSlot) => void;
  /** Book just this slot now (the Book button on its card). */
  onBookSlot: (slot: SelectedSlot) => void;
  /** Take this slot off the selection (the Clear button on its card). */
  onRemoveSlot: (id: string) => void;
  /** Slots picked so far, drawn as cards with Book and Clear. */
  externalSelectedSlots?: SelectedSlot[];
  /** The session whose details are open, to highlight its card. */
  selectedSessionId: string | null;
  onOpenSession: (session: UpcomingSession) => void;
  onCancelSession: (session: UpcomingSession) => void;
  onReportBlockSession: (session: UpcomingSession) => void;
}

const HOUR_HEIGHT = 160;
const MINUTE_HEIGHT = HOUR_HEIGHT / 60;
const SLOT_MINUTES = 15;
const SLOT_HEIGHT = SLOT_MINUTES * MINUTE_HEIGHT;

export function CalendarView({
  durationSelected,
  onSlotSelected,
  onBookSlot,
  onRemoveSlot,
  externalSelectedSlots = [],
  selectedSessionId,
  onOpenSession,
  onCancelSession,
  onReportBlockSession,
}: CalendarViewProps) {
  const cancelWaiting = useCancelSession();
  const { data: user } = useCurrentUser();
  const currentUserId = user?.data?.user?.id;
  const currentUser = user?.data?.user as
    | { displayName?: string; avatarUrl?: string | null }
    | undefined;

  // Calendar State
  const [baseDate, setBaseDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [viewDays, setViewDays] = useState<1 | 3 | 7>(3);

  // Data Fetching
  const isoDateStr = baseDate.toISOString();
  const { data: availableData } = useAvailableBookings(isoDateStr, viewDays);
  const availableBookings: AvailableBooking[] = availableData?.data?.bookings ?? [];

  const { data: myPendingBookings = [] } = useWaitingBookings();

  const { data: myUpcomingData } = useUpcomingSessions();
  const mySessions: UpcomingSession[] = myUpcomingData?.data ?? [];

  // Time the person already has. A new session may not overlap any of it.
  const busyBlocks: TimeBlock[] = [
    ...mySessions.map((s) => ({ start: s.scheduledAt, durationMin: s.durationMin })),
    ...myPendingBookings.map((b) => ({
      start: b.slotTime,
      durationMin: b.durationMin,
    })),
    ...externalSelectedSlots.map((s) => ({ start: s.slotTime, durationMin: s.durationMin })),
  ];

  // Current Time Indicator
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Hover & Selection State
  const [hoverSlot, setHoverSlot] = useState<{
    dateIdx: number;
    minuteOfDay: number;
  } | null>(null);

  // Generate the days for the columns
  const days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < viewDays; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [baseDate, viewDays]);

  // Generate the Y-axis time labels (0 to 23)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Scroll to current time on mount
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      const currentMinute = now.getHours() * 60 + now.getMinutes();
      const targetScroll =
        currentMinute * MINUTE_HEIGHT - scrollRef.current.clientHeight / 2;
      scrollRef.current.scrollTop = Math.max(0, targetScroll);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount

  // Navigation handlers
  const goPrev = () => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - viewDays);
    setBaseDate(d);
  };

  const goNext = () => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + viewDays);
    setBaseDate(d);
  };

  const goToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setBaseDate(d);
    if (scrollRef.current) {
      const currentMinute = now.getHours() * 60 + now.getMinutes();
      scrollRef.current.scrollTop = Math.max(
        0,
        currentMinute * MINUTE_HEIGHT - 300,
      );
    }
  };

  // An empty slot was clicked: add it to the selection
  const selectSlot = (dateIdx: number, minuteOfDay: number) => {
    const start = new Date(days[dateIdx] as Date);
    start.setHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0);
    onSlotSelected(buildSelectedSlot(start, durationSelected));
  };

  // Render Helpers
  const formatHourString = (hour: number) => {
    if (hour === 0) return "12am";
    if (hour === 12) return "12pm";
    return hour > 12 ? `${hour - 12}pm` : `${hour}am`;
  };

  const formatShortTime = (date: Date) => {
    let h = date.getHours();
    const m = date.getMinutes().toString().padStart(2, "0");
    const ampm = h >= 12 ? "p" : "a";
    if (h === 0) h = 12;
    if (h > 12) h -= 12;
    return `${h}:${m}${ampm}`;
  };

  const tzShort =
    new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value || "UTC";

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden relative border-r border-[#BDF1F6]/60">
      {/* Calendar Header - Focusmate style */}
      <div className="h-14 border-b border-slate-100 flex items-center justify-between px-4 shrink-0 bg-white z-10">
        {/* Month/Year with dropdown arrow */}
        <button className="flex items-center gap-1.5 text-base font-bold text-slate-800 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors">
          {baseDate.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          })}
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={viewDays}
              onChange={(e) => setViewDays(Number(e.target.value) as 1 | 3 | 7)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 bg-white outline-none cursor-pointer"
            >
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={goPrev}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
            <button
              onClick={goToday}
              className="px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={goNext}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Day Headers */}
      <div className="flex border-b border-slate-100 bg-[#F2FCFC] shrink-0 pr-2">
        <div className="w-16 shrink-0 flex items-end justify-center pb-2 text-[10px] font-bold text-slate-400 uppercase">
          {tzShort}
        </div>
        {days.map((day, i) => {
          const isToday = day.toDateString() === new Date().toDateString();
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-center py-3 border-l border-slate-100"
            >
              <span
                className={cn(
                  "text-xs font-bold uppercase mb-0.5",
                  isToday ? "text-[#0245A3]" : "text-slate-400",
                )}
              >
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </span>
              <span
                className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold",
                  isToday ? "bg-[#0245A3] text-white" : "text-slate-700",
                )}
              >
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Scrollable Time Grid */}
      <div
        data-calendar-scroll
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative custom-scrollbar bg-white"
        onMouseLeave={() => setHoverSlot(null)}
      >
        <div className="flex relative">
          {/* Y-Axis Labels */}
          <div className="w-16 shrink-0 border-r border-slate-100 relative">
            {hours.map((h) => (
              <div
                key={h}
                className="relative w-full border-b border-transparent"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="absolute -top-2.5 right-2 text-[10px] font-semibold text-slate-800">
                  {h === 0 ? "" : formatHourString(h)}
                </span>
                {/* 15 min subtle tick marks */}
                <div className="absolute top-1/4 right-0 w-2 border-t border-slate-200" />
                <span className="absolute top-1/4 -mt-2.5 right-2 text-[9px] font-medium text-slate-400">
                  :15
                </span>

                <div className="absolute top-2/4 right-0 w-2 border-t border-slate-200" />
                <span className="absolute top-2/4 -mt-2.5 right-2 text-[9px] font-medium text-slate-400">
                  :30
                </span>

                <div className="absolute top-3/4 right-0 w-2 border-t border-slate-200" />
                <span className="absolute top-3/4 -mt-2.5 right-2 text-[9px] font-medium text-slate-400">
                  :45
                </span>
              </div>
            ))}
            {/* Current time label in Y-axis - only when today is visible */}
            {days.some((d) => d.toDateString() === now.toDateString()) &&
              (() => {
                const currentMin = now.getHours() * 60 + now.getMinutes();
                return (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: currentMin * MINUTE_HEIGHT - 8 }}
                  >
                    <span className="absolute right-1 text-[10px] font-bold text-red-500 bg-white leading-none whitespace-nowrap">
                      {formatShortTime(now)}
                    </span>
                  </div>
                );
              })()}
          </div>

          {/* Grid Columns */}
          {days.map((day, dateIdx) => {
            const dayStartStr = day.toDateString();
            const isToday = dayStartStr === now.toDateString();
            const currentMin = now.getHours() * 60 + now.getMinutes();

            // Filter bookings for this column
            const myBookingsInColumn = myPendingBookings.filter(
              (b) => new Date(b.slotTime).toDateString() === dayStartStr,
            );
            const availableInColumn = availableBookings.filter(
              (b) =>
                new Date(b.slotTime).toDateString() === dayStartStr &&
                !isTooSoon(b.slotTime, now) &&
                !isSlotBlocked(b.slotTime, b.durationMin, busyBlocks),
            );
            const sessionsInColumn = mySessions.filter(
              (s) => new Date(s.scheduledAt).toDateString() === dayStartStr,
            );

            return (
              <div
                key={dateIdx}
                className={cn(
                  "flex-1 border-r border-slate-100 relative group",
                  isToday && "bg-slate-50/80",
                )}
                style={{ height: 24 * HOUR_HEIGHT }}
                onMouseLeave={() => setHoverSlot(null)}
              >
                {/* Horizontal hour lines */}
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full border-b border-slate-100 pointer-events-none"
                    style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                  >
                    {/* Subtle dotted 30min line */}
                    <div className="absolute top-1/2 w-full border-t border-dashed border-slate-100/50" />
                  </div>
                ))}

                {/* Red current time line — today column only */}
                {isToday && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: currentMin * MINUTE_HEIGHT }}
                  >
                    <div className="w-full border-t-2 border-red-500 relative">
                      <div className="absolute -top-[5px] -left-[5px] w-2.5 h-2.5 rounded-full bg-red-500" />
                    </div>
                  </div>
                )}

                {/* 15-minute Interactive Zones */}
                {Array.from({ length: 24 * 4 }).map((_, slotIdx) => {
                  const minuteOfDay = slotIdx * 15;
                  const slotStart = new Date(day);
                  slotStart.setHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0);
                  // Not selectable: too soon to start, or it would overlap time that is already taken.
                  const unavailable =
                    isTooSoon(slotStart, now) || isSlotBlocked(slotStart, durationSelected, busyBlocks);

                  return (
                    <div
                      key={slotIdx}
                      className={cn("absolute w-full", unavailable && "cursor-not-allowed")}
                      style={{
                        top: minuteOfDay * MINUTE_HEIGHT,
                        height: SLOT_HEIGHT,
                      }}
                      onMouseEnter={() => {
                        setHoverSlot(unavailable ? null : { dateIdx, minuteOfDay });
                      }}
                      onClick={() => {
                        if (unavailable) return;
                        selectSlot(dateIdx, minuteOfDay);
                        setHoverSlot(null);
                      }}
                    />
                  );
                })}

                {/* HOVER PREVIEW - user avatar + duration */}
                {hoverSlot?.dateIdx === dateIdx && (
                  <div
                    className="absolute left-1 right-2 rounded-xl border-2 border-dashed border-[#0245A3]/50 pointer-events-none z-10 overflow-hidden"
                    style={{
                      top: hoverSlot.minuteOfDay * MINUTE_HEIGHT,
                      height: durationSelected * MINUTE_HEIGHT,
                      backgroundColor: "rgba(2,69,163,0.06)",
                    }}
                  >
                    <div className="p-2 flex items-center gap-2">
                      <Avatar className="w-9 h-9 rounded-xl shrink-0 border-2 border-white shadow-sm">
                        <AvatarImage
                          src={currentUser?.avatarUrl ?? undefined}
                          className="object-cover"
                        />
                        <AvatarFallback className="rounded-xl bg-[#0245A3]/20 text-[#0245A3] text-xs font-bold">
                          {currentUser?.displayName?.charAt(0)?.toUpperCase() ??
                            "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-bold text-[#0245A3]">
                        {durationSelected}
                      </span>
                      <Shuffle className="w-3.5 h-3.5 text-[#0245A3]/60" />
                    </div>
                  </div>
                )}

                {/* SELECTED SLOTS: a card with Book (this slot only) and Clear */}
                {externalSelectedSlots
                  .filter((s) => new Date(s.slotTime).toDateString() === dayStartStr)
                  .map((s) => {
                    const slotDate = new Date(s.slotTime);
                    const slotMin = slotDate.getHours() * 60 + slotDate.getMinutes();
                    return (
                      <div
                        key={s.id}
                        className="absolute left-1 right-2 rounded-xl bg-white border-2 border-[#0245A3] shadow-xl z-20 overflow-hidden flex flex-col"
                        style={{
                          top: slotMin * MINUTE_HEIGHT,
                          height: Math.max(s.durationMin * MINUTE_HEIGHT, 100),
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => onBookSlot(s)}
                          className="w-full py-2.5 bg-[#0245A3] text-white text-sm font-bold hover:brightness-110 transition-all shrink-0"
                        >
                          Book
                        </button>
                        <div className="flex-1 flex items-start gap-2 p-2">
                          <Avatar className="w-7 h-7 rounded-lg shrink-0 border border-white/60">
                            <AvatarImage src={currentUser?.avatarUrl ?? undefined} className="object-cover" />
                            <AvatarFallback className="rounded-lg bg-[#0245A3]/15 text-[#0245A3] text-[10px] font-bold">
                              {currentUser?.displayName?.charAt(0)?.toUpperCase() ?? "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-slate-700">{s.timeRange}</div>
                            <div className="text-[10px] text-slate-400">{s.durationMin} min</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveSlot(s.id)}
                          className="w-full py-2 text-[#0245A3] text-sm font-semibold hover:bg-slate-50 transition-colors border-t border-slate-100 shrink-0"
                        >
                          Clear
                        </button>
                      </div>
                    );
                  })}

                {/* PEOPLE WAITING FOR A PARTNER */}
                {availableInColumn.map((b) => {
                  const d = new Date(b.slotTime);
                  return (
                    <WaitingPerson
                      key={b.id}
                      booking={b}
                      top={(d.getHours() * 60 + d.getMinutes()) * MINUTE_HEIGHT}
                      onSelect={(booking) => onSlotSelected(buildSelectedSlot(new Date(booking.slotTime), booking.durationMin))}
                    />
                  );
                })}

                {/* MY PENDING BOOKINGS - Focusmate card style */}
                {myBookingsInColumn.map((b) => {
                  const d = new Date(b.slotTime);
                  const min = d.getHours() * 60 + d.getMinutes();
                  const endMin = min + b.durationMin;
                  const endH = Math.floor(endMin / 60);
                  const fmt = (h: number, m: number) => {
                    const ap = h >= 12 ? "pm" : "am";
                    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                    return `${h12}:${m.toString().padStart(2, "0")}${ap}`;
                  };
                  const pxH = Math.max(b.durationMin * MINUTE_HEIGHT, 60);
                  return (
                    <div
                      key={b.id}
                      className="absolute left-1 right-2 rounded-xl bg-slate-50 border-l-4 border-slate-400 z-20 overflow-hidden"
                      style={{ top: min * MINUTE_HEIGHT, height: pxH }}
                    >
                      <div className="p-2 flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                          <div className="w-4 h-4 text-slate-400 text-[10px] flex items-center justify-center">
                            👤
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold text-slate-600">
                            {fmt(d.getHours(), d.getMinutes())}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Matching...
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label="Cancel this booking"
                          onClick={() =>
                            cancelWaiting.mutate(b.id, {
                              onSuccess: () => toast.success("Booking cancelled"),
                              onError: (error) => toast.error(error.message),
                            })
                          }
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-red-600"
                        >
                          <X className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* MY MATCHED SESSIONS: partner, menu, cancel and Join live on the card */}
                {sessionsInColumn.map((s) => {
                  const d = new Date(s.scheduledAt);
                  return (
                    <CalendarSessionCard
                      key={s.id}
                      session={s}
                      now={now}
                      top={(d.getHours() * 60 + d.getMinutes()) * MINUTE_HEIGHT}
                      height={s.durationMin * MINUTE_HEIGHT}
                      selected={s.id === selectedSessionId}
                      onOpen={onOpenSession}
                      onCancel={onCancelSession}
                      onReportBlock={onReportBlockSession}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
