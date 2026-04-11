"use client";

import { useState } from "react";
import { useSessionHistory } from "@/hooks/useSessions";
import { Badge } from "@focusUp/ui/components/badge";
import { Skeleton } from "@focusUp/ui/components/skeleton";
import { cn } from "@focusUp/ui/lib/utils";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Star,
  FileText,
} from "lucide-react";

const HISTORY_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  COMPLETED: { label: "Completed", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELLED: { label: "Cancelled", className: "bg-slate-50 text-slate-500 border-slate-200" },
  NO_SHOW: { label: "No Show", className: "bg-red-50 text-red-600 border-red-200" },
};

function HistoryItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-slate-50 last:border-0">
      <Skeleton className="w-10 h-10 rounded-xl" />
      <div className="flex-1">
        <Skeleton className="w-32 h-4 rounded mb-1.5" />
        <Skeleton className="w-48 h-3 rounded" />
      </div>
      <Skeleton className="w-20 h-5 rounded-full" />
    </div>
  );
}

export default function SessionHistory() {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading } = useSessionHistory(page);

  const sessions = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#0245A3]" />
          <h3 className="font-bold text-sm text-[#001945]">Session History</h3>
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {data?.total ?? 0} total
        </span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div>
          <HistoryItemSkeleton />
          <HistoryItemSkeleton />
          <HistoryItemSkeleton />
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-12 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-400">
            Complete your first session to see it here
          </p>
        </div>
      ) : (
        <div>
          {sessions.map((session: Record<string, unknown>) => {
            const statusCfg = HISTORY_STATUS_CONFIG[session.status as string] ?? HISTORY_STATUS_CONFIG.COMPLETED;
            const isExpanded = expandedId === (session.id as string);
            const partner = session.partner as Record<string, unknown> | null;
            const scheduledAt = new Date(session.scheduledAt as string);

            return (
              <div key={session.id as string} className="border-b border-slate-50 last:border-0">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : (session.id as string))}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/50 transition-colors text-left"
                >
                  {/* Partner avatar */}
                  <div className="w-9 h-9 rounded-xl bg-[#0245A3]/10 flex items-center justify-center text-sm font-bold text-[#0245A3] shrink-0">
                    {(partner?.displayName as string)?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-[#001945] truncate">
                      {(partner?.displayName as string) ?? "Partner"}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">
                      {scheduledAt.toLocaleDateString([], { month: "short", day: "numeric" })} · {(session.durationMin as number)} min
                    </div>
                  </div>

                  {/* Reflection snippet */}
                  {session.reflectionSnippet && (
                    <span className="hidden md:block max-w-[200px] text-xs text-slate-400 truncate italic">
                      &ldquo;{session.reflectionSnippet as string}&rdquo;
                    </span>
                  )}

                  <Badge variant="outline" className={cn("text-[10px] font-bold border shrink-0", statusCfg.className)}>
                    {statusCfg.label}
                  </Badge>

                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-slate-300 transition-transform duration-200 shrink-0",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>

                {/* Expanded reflection */}
                {isExpanded && session.reflectionSnippet && (
                  <div className="px-5 pb-4 animate-in slide-in-from-top-1 fade-in duration-200">
                    <div className="bg-slate-50 rounded-xl p-4 ml-13">
                      {session.rating && (
                        <div className="flex items-center gap-1 mb-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "w-3.5 h-3.5",
                                i < (session.rating as number)
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-slate-200"
                              )}
                            />
                          ))}
                        </div>
                      )}
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {session.reflectionSnippet as string}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-[0.98]",
              page <= 1
                ? "text-slate-300 cursor-not-allowed"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>
          <span className="text-xs text-slate-400 font-bold">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-[0.98]",
              page >= totalPages
                ? "text-slate-300 cursor-not-allowed"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
