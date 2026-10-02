"use client";

import { cn } from "@focusUp/ui/lib/utils";
import { Monitor, PersonStanding, Shapes, Info } from "lucide-react";

const DURATIONS = [25, 50, 75] as const;
const TASKS = [
  { id: "desk", label: "Desk", icon: Monitor },
  { id: "moving", label: "Moving", icon: PersonStanding },
  { id: "any", label: "Anything", icon: Shapes },
] as const;

interface BookingSidebarProps {
  duration: number;
  setDuration: (val: number) => void;
  taskType: string;
  setTaskType: (val: string) => void;
  quietMode: boolean;
  setQuietMode: (val: boolean) => void;
  preferFavorites: boolean;
  setPreferFavorites: (val: boolean) => void;
}

export function BookingSidebar({
  duration,
  setDuration,
  taskType,
  setTaskType,
  quietMode,
  setQuietMode,
  preferFavorites,
  setPreferFavorites,
}: BookingSidebarProps) {
  return (
    <div className="w-[280px] bg-white border-r border-slate-100 flex flex-col shrink-0 h-full overflow-y-auto custom-scrollbar">
      <div className="p-5 space-y-5">
        {/* Book Session CTA */}
        <button
          className="w-full py-3.5 bg-[#0245A3] text-white rounded-2xl font-bold text-sm shadow-lg shadow-[#0245A3]/20 hover:brightness-110 active:scale-[0.98] transition-all"
          onClick={() => {
            const calendar = document.getElementById("calendar-scroll-area");
            if (calendar) {
              calendar.scrollTop =
                calendar.scrollHeight / 2 - calendar.clientHeight / 2;
            }
          }}
        >
          Book Session
        </button>

        {/* Settings card */}
        <div className="bg-[#F2FCFC] rounded-2xl border border-[#BDF1F6] p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#001945] text-sm">
              Session Settings
            </h3>
            <Info className="w-4 h-4 text-[#8FBAF3]" />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Duration
            </label>
            <div className="flex gap-1 bg-white p-1 rounded-xl border border-[#BDF1F6]">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={cn(
                    "flex-1 py-2 px-1 rounded-[10px] text-sm font-bold transition-all flex flex-col items-center justify-center gap-0.5",
                    duration === d
                      ? "bg-[#0245A3] text-white shadow-md shadow-[#0245A3]/20"
                      : "text-slate-400 hover:text-[#0245A3] hover:bg-[#BDF1F6]/40",
                  )}
                >
                  <span>{d}</span>
                  <span className="text-[9px] font-medium leading-none opacity-80">
                    min
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Task Type */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              My Task
            </label>
            <div className="flex gap-1 bg-white p-1 rounded-xl border border-[#BDF1F6]">
              {TASKS.map((task) => {
                const Icon = task.icon;
                return (
                  <button
                    key={task.id}
                    onClick={() => setTaskType(task.id)}
                    className={cn(
                      "flex-1 py-2 px-1 rounded-[10px] transition-all flex flex-col items-center justify-center gap-1",
                      taskType === task.id
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

          {/* Toggles */}
          <div className="space-y-4">
            {/* Quiet Mode */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#001945]">
                Quiet Mode
              </span>
              <button
                onClick={() => setQuietMode(!quietMode)}
                aria-checked={quietMode}
                role="switch"
                className={cn(
                  "w-10 h-6 flex items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0245A3]",
                  quietMode ? "bg-[#0245A3]" : "bg-slate-200",
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                    quietMode ? "translate-x-5" : "translate-x-1",
                  )}
                />
              </button>
            </div>

            {/* Prefer Favorites */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#001945]">
                Prefer Favorites
              </span>
              <button
                onClick={() => setPreferFavorites(!preferFavorites)}
                aria-checked={preferFavorites}
                role="switch"
                className={cn(
                  "w-10 h-6 flex items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0245A3]",
                  preferFavorites ? "bg-[#0245A3]" : "bg-slate-200",
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                    preferFavorites ? "translate-x-5" : "translate-x-1",
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* How it works hint */}
        <div className="rounded-2xl bg-[#BDF1F6]/40 border border-[#BDF1F6] p-4">
          <p className="text-xs font-semibold text-[#0245A3] leading-relaxed">
            Click any open slot on the calendar to book a focus session.
            Partners are matched automatically at session time.
          </p>
        </div>
      </div>
    </div>
  );
}
