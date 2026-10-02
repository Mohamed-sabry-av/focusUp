"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@focusUp/ui/lib/utils";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import {
  useAvailableBookings,
  useCreateBooking,
  useUserBookings,
} from "@/hooks/useBookings";
import { useUpcomingSessions } from "@/hooks/useSessions";
import { useCurrentUser } from "@/hooks/useUser";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@focusUp/ui/components/avatar";
import { toast } from "sonner";

interface CalendarViewProps {
  durationSelected: number; // 25, 50, 75
  taskType: string;
  onSlotSelected?: (slot: {
    id: string;
    dateLabel: string;
    timeRange: string;
    durationMin: number;
    slotTime: string;
  }) => void;
}

const HOUR_HEIGHT = 160;
const MINUTE_HEIGHT = HOUR_HEIGHT / 60;
const SLOT_MINUTES = 15;
const SLOT_HEIGHT = SLOT_MINUTES * MINUTE_HEIGHT;

export function CalendarView({
  durationSelected,
  taskType,
  onSlotSelected,
}: CalendarViewProps) {
  const { data: user } = useCurrentUser();
  const currentUserId = user?.data?.user?.id;
  const createBooking = useCreateBooking();

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
  const availableBookings = availableData?.data?.bookings || [];

  const { data: myPendingData } = useUserBookings("PENDING");
  const myPendingBookings = myPendingData?.bookings || [];

  const { data: myUpcomingData } = useUpcomingSessions();
  const mySessions = Array.isArray(myUpcomingData?.data)
    ? myUpcomingData.data
    : [];

  // Current Time Indicator
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Hover & Selection State
  const [hoverSlot, setHoverSlot] = useState<{
    dateIdx: number;
    minuteOfDay: number;
  } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{
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
    setSelectedSlot(null);
  };

  const goNext = () => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + viewDays);
    setBaseDate(d);
    setSelectedSlot(null);
  };

  const goToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setBaseDate(d);
    setSelectedSlot(null);
    if (scrollRef.current) {
      const currentMinute = now.getHours() * 60 + now.getMinutes();
      scrollRef.current.scrollTop = Math.max(
        0,
        currentMinute * MINUTE_HEIGHT - 300,
      );
    }
  };

  // Convert slot hover to actual date string for booking
  const handleBook = async () => {
    if (!selectedSlot) return;
    const targetDate = new Date(days[selectedSlot.dateIdx]);
    targetDate.setHours(
      Math.floor(selectedSlot.minuteOfDay / 60),
      selectedSlot.minuteOfDay % 60,
      0,
      0,
    );

    // If a parent wants to collect slots (multi-booking flow), notify it
    if (onSlotSelected) {
      const hours = Math.floor(selectedSlot.minuteOfDay / 60);
      const mins = selectedSlot.minuteOfDay % 60;
      const endMins = selectedSlot.minuteOfDay + durationSelected;
      const endHours = Math.floor(endMins / 60);
      const endMinRem = endMins % 60;
      const fmt = (h: number, m: number) => {
        const ampm = h >= 12 ? "pm" : "am";
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${h12}:${m.toString().padStart(2, "0")}${ampm}`;
      };
      const slotId = `${targetDate.toISOString()}-${durationSelected}`;

      onSlotSelected({
        id: slotId,
        dateLabel: targetDate.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        }),
        timeRange: `${fmt(hours, mins)} - ${fmt(endHours, endMinRem)}`,
        durationMin: durationSelected,
        slotTime: targetDate.toISOString(),
      });
      setSelectedSlot(null);
      return;
    }

    // Legacy: immediate single booking
    try {
      await createBooking.mutateAsync({
        slotTime: targetDate.toISOString(),
        durationMin: durationSelected,
      });
      setSelectedSlot(null);
      toast.success("Session booked!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to book");
    }
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
      {/* Calendar Header */}
      <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 bg-white z-10 relative">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-slate-800">
            {baseDate.toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={viewDays}
            onChange={(e) => setViewDays(Number(e.target.value) as 1 | 3 | 7)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 outline-none"
          >
            <option value={1}>1 day</option>
            <option value={3}>3 days</option>
            <option value={7}>7 days</option>
          </select>

          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
            <button
              onClick={goPrev}
              className="px-2 py-1.5 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
            <div className="w-px h-4 bg-slate-200" />
            <button
              onClick={goToday}
              className="px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Today
            </button>
            <div className="w-px h-4 bg-slate-200" />
            <button
              onClick={goNext}
              className="px-2 py-1.5 hover:bg-slate-50 transition-colors"
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
        id="calendar-scroll-area"
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative custom-scrollbar bg-white"
        onMouseLeave={() => setHoverSlot(null)}
      >
        {/* Current Time Line */}
        {(() => {
          const isTodayVisible = days.some(
            (d) => d.toDateString() === now.toDateString(),
          );
          if (!isTodayVisible) return null;
          const currentMin = now.getHours() * 60 + now.getMinutes();
          return (
            <div
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: currentMin * MINUTE_HEIGHT }}
            >
              <div className="w-full border-t-[1.5px] border-red-500 relative">
                <div className="absolute -top-[5px] left-[54px] w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" />
                <div className="absolute -top-2.5 left-2 text-[10px] font-bold text-red-500 bg-white px-1">
                  {formatShortTime(now)}
                </div>
              </div>
            </div>
          );
        })()}

        <div className="flex relative">
          {/* Y-Axis Labels */}
          <div className="w-16 shrink-0 border-r border-slate-100">
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
          </div>

          {/* Grid Columns */}
          {days.map((day, dateIdx) => {
            const dayStartStr = day.toDateString();
            const isToday = dayStartStr === now.toDateString();
            const currentMin = now.getHours() * 60 + now.getMinutes();

            // Filter bookings for this column
            const myBookingsInColumn = myPendingBookings.filter(
              (b: any) => new Date(b.slotTime).toDateString() === dayStartStr,
            );
            const availableInColumn = availableBookings.filter(
              (b: any) => new Date(b.slotTime).toDateString() === dayStartStr,
            );
            const sessionsInColumn = mySessions.filter(
              (s: any) =>
                new Date(s.scheduledAt).toDateString() === dayStartStr,
            );

            return (
              <div
                key={dateIdx}
                className="flex-1 border-r border-slate-100 relative group"
                style={{ height: 24 * HOUR_HEIGHT }}
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

                {/* 15-minute Interactive Zones */}
                {Array.from({ length: 24 * 4 }).map((_, slotIdx) => {
                  const minuteOfDay = slotIdx * 15;
                  const isPast = isToday && minuteOfDay < currentMin - 5;

                  return (
                    <div
                      key={slotIdx}
                      className="absolute w-full"
                      style={{
                        top: minuteOfDay * MINUTE_HEIGHT,
                        height: SLOT_HEIGHT,
                      }}
                      onMouseEnter={() => {
                        if (!isPast && !selectedSlot) {
                          setHoverSlot({ dateIdx, minuteOfDay });
                        }
                      }}
                      onClick={() => {
                        if (!isPast) {
                          setSelectedSlot({ dateIdx, minuteOfDay });
                          setHoverSlot(null);
                        }
                      }}
                    />
                  );
                })}

                {/* RENDER HOVER PREVIEW BLOCK */}
                {hoverSlot?.dateIdx === dateIdx && !selectedSlot && (
                  <div
                    className="absolute left-1 right-2 rounded-[12px] bg-white border-2 border-dashed border-[#0245A3] shadow-lg pointer-events-none z-10 overflow-hidden flex flex-col"
                    style={{
                      top: hoverSlot.minuteOfDay * MINUTE_HEIGHT,
                      height: durationSelected * MINUTE_HEIGHT,
                    }}
                  >
                    <div className="bg-[#0245A3]/10 w-full h-full p-2 flex flex-col">
                      <div className="flex items-center gap-1.5 text-[#0245A3]">
                        <div className="w-5 h-5 rounded-md bg-[#0245A3] flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="font-bold text-xs">
                          {durationSelected} ⏱
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* RENDER SELECTED BLOCK (Awaiting confirmation) */}
                {selectedSlot?.dateIdx === dateIdx && (
                  <div
                    className="absolute left-1 right-2 rounded-[12px] bg-white border-2 border-[#0245A3] shadow-xl z-20 overflow-hidden flex flex-col"
                    style={{
                      top: selectedSlot.minuteOfDay * MINUTE_HEIGHT,
                      height: Math.max(durationSelected * MINUTE_HEIGHT, 100), // Ensure enough room for buttons
                    }}
                  >
                    <div className="flex flex-col h-full bg-[#0245A3]/5 p-2 gap-2">
                      <div className="flex items-center gap-1.5 text-[#0245A3]">
                        <span className="font-bold text-xs">
                          {durationSelected} ⏱
                        </span>
                        <span className="text-xs font-semibold">
                          Ready to book?
                        </span>
                      </div>

                      <div className="mt-auto flex flex-col gap-1.5">
                        <button
                          disabled={createBooking.isPending}
                          onClick={handleBook}
                          className="w-full py-2 bg-[#0245A3] text-white text-xs font-bold rounded-lg hover:brightness-110 disabled:opacity-50"
                        >
                          {createBooking.isPending ? "Booking..." : "Book"}
                        </button>
                        <button
                          disabled={createBooking.isPending}
                          onClick={() => setSelectedSlot(null)}
                          className="w-full py-1.5 bg-white text-slate-500 border border-slate-200 text-xs font-bold rounded-lg hover:bg-slate-50 disabled:opacity-50"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* AVAILABLE BOOKINGS (Other Users) */}
                {availableInColumn.map((b: any) => {
                  const d = new Date(b.slotTime);
                  const min = d.getHours() * 60 + d.getMinutes();
                  return (
                    <div
                      key={b.id}
                      className="absolute right-3 w-8 h-8 rounded-full border-2 border-white shadow-md z-30 cursor-pointer overflow-hidden transform transition-transform hover:scale-110"
                      style={{ top: min * MINUTE_HEIGHT - 4 }} // center on the line
                      title={`${b.user.displayName} · ${b.durationMin}min`}
                      onClick={() => {
                        // Quick click to match them
                        createBooking.mutate({
                          slotTime: b.slotTime,
                          durationMin: b.durationMin,
                        });
                      }}
                    >
                      <Avatar className="w-full h-full">
                        <AvatarImage src={b.user.avatarUrl} />
                        <AvatarFallback className="bg-amber-100 text-amber-700 text-xs font-bold">
                          {b.user.displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  );
                })}

                {/* MY PENDING BOOKINGS */}
                {myBookingsInColumn.map((b: any) => {
                  const d = new Date(b.slotTime);
                  const min = d.getHours() * 60 + d.getMinutes();
                  return (
                    <div
                      key={b.id}
                      className="absolute left-3 w-9 h-9 rounded-full border-2 border-white shadow-md z-30 bg-[#0245A3] text-white flex flex-col items-center justify-center cursor-help ring-2 ring-[#0245A3]/30 ring-offset-1"
                      style={{ top: min * MINUTE_HEIGHT - 18 }} // offset slightly
                      title={`Your pending booking · ${b.durationMin}min`}
                    >
                      <span className="text-xs font-bold">{b.durationMin}</span>
                    </div>
                  );
                })}

                {/* CONFIRMED SESSIONS */}
                {sessionsInColumn.map((s: any) => {
                  const d = new Date(s.scheduledAt);
                  const min = d.getHours() * 60 + d.getMinutes();

                  const isUser1 = s.user1?.id === currentUserId;
                  const partner = isUser1 ? s.user2 : s.user1;
                  const pxHeight = s.durationMin * MINUTE_HEIGHT;

                  return (
                    <div
                      key={s.id}
                      className="absolute left-1 right-2 rounded-[12px] bg-[#0245A3] shadow-md z-20 flex flex-col overflow-hidden text-white hover:brightness-110 transition-all cursor-pointer"
                      style={{
                        top: min * MINUTE_HEIGHT,
                        height: pxHeight,
                      }}
                    >
                      <div className="p-2 flex items-start gap-2 h-full">
                        <Avatar className="w-6 h-6 border uppercase border-white/20 shrink-0">
                          <AvatarImage src={partner?.avatarUrl || ""} />
                          <AvatarFallback className="bg-emerald-500 text-[10px] text-white font-bold">
                            {partner?.displayName?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-xs truncate">
                            {partner?.displayName || "Partner"}
                          </div>
                          <div className="text-[10px] text-white/80 font-medium">
                            {s.durationMin} min
                          </div>
                        </div>
                      </div>
                    </div>
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
