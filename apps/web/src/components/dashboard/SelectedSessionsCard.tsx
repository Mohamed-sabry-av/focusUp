"use client";

import { AlertCircle, CheckCircle2, Clock, X } from "lucide-react";
import { cn } from "@focusUp/ui/lib/utils";

import type { SelectedSlot, SlotOutcome } from "@/lib/selected-slot";

interface SelectedSessionsCardProps {
  slots: SelectedSlot[];
  /** What happened to each slot the last time Book was pressed, by slot id. */
  outcomes: Record<string, SlotOutcome>;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

/** "N Sessions Selected": the times picked on the calendar, with the reason when one could not be booked. */
export function SelectedSessionsCard({
  slots,
  outcomes,
  onRemove,
  onClearAll,
}: SelectedSessionsCardProps) {
  if (slots.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-slate-500">
          {slots.length} Session{slots.length !== 1 ? "s" : ""} Selected
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-slate-400 hover:text-red-500 transition-colors"
        >
          Clear all
        </button>
      </div>

      <ul className="space-y-2">
        {slots.map((slot) => {
          const outcome = outcomes[slot.id];
          return (
            <li
              key={slot.id}
              className={cn(
                "rounded-xl border p-3",
                outcome?.kind === "failed"
                  ? "border-red-200 bg-red-50"
                  : "border-[#0245A3]/30 bg-[#0245A3]/5",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-700">{slot.dateLabel}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{slot.timeRange}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] font-bold text-[#0245A3]">{slot.durationMin}m</span>
                  <button
                    type="button"
                    aria-label={`Remove ${slot.dateLabel} ${slot.timeRange}`}
                    onClick={() => onRemove(slot.id)}
                    className="ml-1 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {outcome && (
                <p
                  role={outcome.kind === "failed" ? "alert" : "status"}
                  className={cn(
                    "mt-2 flex items-start gap-1.5 text-[11px] font-semibold leading-snug",
                    outcome.kind === "failed" && "text-red-600",
                    outcome.kind === "matched" && "text-emerald-700",
                    outcome.kind === "waiting" && "text-slate-600",
                  )}
                >
                  {outcome.kind === "failed" && <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden />}
                  {outcome.kind === "matched" && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden />}
                  {outcome.kind === "waiting" && <Clock className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden />}
                  <span>{outcome.message}</span>
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
