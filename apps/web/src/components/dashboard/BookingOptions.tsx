"use client";

import { useState } from "react";
import { Info, Monitor, PersonStanding, Shapes, X } from "lucide-react";
import { cn } from "@focusUp/ui/lib/utils";

import {
  SESSION_DURATIONS,
  TASK_OPTIONS,
  type BookingOptions as BookingOptionsValue,
  type TaskType,
} from "@/lib/booking-options";
import { Switch } from "./Switch";

const TASK_ICONS: Record<TaskType, React.ElementType> = {
  DESK: Monitor,
  WALK: PersonStanding,
  ANY: Shapes,
};

interface BookingOptionsProps {
  duration: number;
  onDurationChange: (duration: number) => void;
  options: BookingOptionsValue;
  /** Receives only what changed, so two quick changes can never overwrite each other. */
  onOptionsChange: (patch: Partial<BookingOptionsValue>) => void;
}

/**
 * The session settings: duration, task, Quiet mode and Prefer Favorites.
 * Used by the desktop sidebar and the mobile sheet, so they cannot drift apart.
 */
export function BookingOptions({
  duration,
  onDurationChange,
  options,
  onOptionsChange: set,
}: BookingOptionsProps) {
  const [quietNoteDismissed, setQuietNoteDismissed] = useState(false);

  return (
    <div className="space-y-5">
      {/* Duration */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
          Duration
        </span>
        <div role="radiogroup" aria-label="Session duration" className="flex gap-1 bg-white p-1 rounded-xl border border-[#BDF1F6]">
          {SESSION_DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={duration === d}
              onClick={() => onDurationChange(d)}
              className={cn(
                "flex-1 py-2 px-1 rounded-[10px] text-sm font-bold transition-all flex flex-col items-center justify-center gap-0.5",
                duration === d
                  ? "bg-[#0245A3] text-white shadow-md shadow-[#0245A3]/20"
                  : "text-slate-400 hover:text-[#0245A3] hover:bg-[#BDF1F6]/40",
              )}
            >
              <span>{d}</span>
              <span className="text-[9px] font-medium leading-none opacity-80">min</span>
            </button>
          ))}
        </div>
      </div>

      {/* Task */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
          My Task
        </span>
        <div role="radiogroup" aria-label="My task" className="flex gap-1 bg-white p-1 rounded-xl border border-[#BDF1F6]">
          {TASK_OPTIONS.map((task) => {
            const Icon = TASK_ICONS[task.id];
            return (
              <button
                key={task.id}
                type="button"
                role="radio"
                aria-checked={options.taskType === task.id}
                onClick={() => set({ taskType: task.id })}
                className={cn(
                  "flex-1 py-2 px-1 rounded-[10px] transition-all flex flex-col items-center justify-center gap-1",
                  options.taskType === task.id
                    ? "bg-[#0245A3] text-white shadow-md shadow-[#0245A3]/20"
                    : "text-slate-400 hover:text-[#0245A3] hover:bg-[#BDF1F6]/40",
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-bold">{task.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-[#BDF1F6] w-full" />

      {/* Quiet mode */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-[#001945]">Quiet Mode</span>
          <Switch checked={options.quiet} onChange={(quiet) => set({ quiet })} label="Quiet Mode" />
        </div>
        {!quietNoteDismissed && (
          <div className="flex items-start gap-2 rounded-xl bg-[#BDF1F6]/40 border border-[#BDF1F6] p-3 text-xs font-medium text-[#0245A3] leading-relaxed">
            <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
            <p className="flex-1">
              You may still match with people who are not in Quiet Mode. They will see a Quiet badge
              for you.
            </p>
            <button
              type="button"
              aria-label="Dismiss note"
              onClick={() => setQuietNoteDismissed(true)}
              className="shrink-0 text-[#0245A3]/70 hover:text-[#0245A3]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Prefer favorites */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[#001945]">Prefer Favorites</span>
        <Switch
          checked={options.preferFavorites}
          onChange={(preferFavorites) => set({ preferFavorites })}
          label="Prefer Favorites"
        />
      </div>
    </div>
  );
}
